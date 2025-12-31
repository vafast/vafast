/**
 * 类型安全的路由处理器工厂
 *
 * 使用柯里化设计，确保 TypeScript 能够正确推导类型
 * schema 参数在前，handler 在后，让 TS 有足够信息进行类型推导
 *
 * @author Framework Team
 * @version 2.0.0
 * @license MIT
 */

import type { TSchema } from "@sinclair/typebox";
import type {
  RouteSchema,
  HandlerContext,
  HandlerContextWithExtra,
} from "../types/schema";
import { parseBody, parseQuery, parseHeaders, parseCookies } from "./parsers";
import { goAwait } from "./go-await";
import { json } from "./response";
import {
  validateAllSchemasUltra,
  precompileSchemasUltra,
} from "./validators/schema-validators-ultra";

/**
 * 自动响应转换
 * 将各种返回值类型转换为 Response 对象
 */
function autoResponse(result: unknown): Response {
  // 已经是 Response
  if (result instanceof Response) {
    return result;
  }

  // null/undefined -> 204
  if (result === null || result === undefined) {
    return new Response(null, { status: 204 });
  }

  // 字符串 -> text/plain
  if (typeof result === "string") {
    return new Response(result, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // 数字/布尔 -> text/plain
  if (typeof result === "number" || typeof result === "boolean") {
    return new Response(String(result), {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // 对象 -> 检查是否是 { data, status, headers } 格式
  if (typeof result === "object") {
    const obj = result as Record<string, unknown>;
    if ("data" in obj && ("status" in obj || "headers" in obj)) {
      const { data, status = 200, headers = {} } = obj;

      if (data === null || data === undefined) {
        return new Response(null, {
          status: status === 200 ? 204 : (status as number),
          headers: headers as HeadersInit,
        });
      }

      if (
        typeof data === "string" ||
        typeof data === "number" ||
        typeof data === "boolean"
      ) {
        return new Response(String(data), {
          status: status as number,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            ...(headers as Record<string, string>),
          },
        });
      }

      return json(data, status as number, headers as Record<string, string>);
    }

    // 普通对象 -> JSON
    return json(result);
  }

  // 其他类型 -> 204
  return new Response(null, { status: 204 });
}

/**
 * 处理验证错误
 */
function handleValidationError(error: Error): Response {
  return json(
    {
      success: false,
      error: "Validation Error",
      message: error.message,
      timestamp: new Date().toISOString(),
    },
    400,
  );
}

/**
 * 处理内部错误
 */
function handleInternalError(error: unknown): Response {
  return json(
    {
      success: false,
      error: "Internal Error",
      message: error instanceof Error ? error.message : "未知错误",
    },
    500,
  );
}

/**
 * 创建类型安全的路由处理器 (柯里化版本)
 *
 * @param schema Schema 配置
 * @returns 返回一个接受 handler 的函数
 *
 * @example
 * ```typescript
 * // 基础用法
 * const handler = createHandler({
 *   body: Type.Object({ name: Type.String() })
 * })(({ body }) => {
 *   // body 自动推导为 { name: string }
 *   return { hello: body.name };
 * });
 *
 * // 在路由中使用
 * const routes = [
 *   {
 *     method: "POST",
 *     path: "/users",
 *     handler: createHandler({
 *       body: Type.Object({
 *         name: Type.String(),
 *         email: Type.String()
 *       })
 *     })(({ body }) => {
 *       return { id: 1, ...body };
 *     })
 *   }
 * ];
 * ```
 */
export function createHandler<const T extends RouteSchema>(schema: T) {
  // 预编译 schema
  if (
    schema.body ||
    schema.query ||
    schema.params ||
    schema.headers ||
    schema.cookies
  ) {
    precompileSchemasUltra(schema);
  }

  return <R>(
    handler: (ctx: HandlerContext<T>) => R | Promise<R>,
  ): ((req: Request) => Promise<Response>) => {
    return async (req: Request): Promise<Response> => {
      try {
        // 解析请求数据
        const query = parseQuery(req);
        const headers = parseHeaders(req);
        const cookies = parseCookies(req);
        const params =
          ((req as unknown as Record<string, unknown>).params as Record<
            string,
            string
          >) || {};

        // 解析请求体
        let body: unknown = undefined;
        if (req.method !== "GET" && req.method !== "HEAD") {
          const [, parsedBody] = await goAwait(parseBody(req));
          body = parsedBody;
        }

        // 验证 schema
        const data = { body, query, params, headers, cookies };
        if (
          schema.body ||
          schema.query ||
          schema.params ||
          schema.headers ||
          schema.cookies
        ) {
          validateAllSchemasUltra(schema, data);
        }

        // 调用 handler
        const result = await handler({
          req,
          body: body as HandlerContext<T>["body"],
          query: query as HandlerContext<T>["query"],
          params: params as HandlerContext<T>["params"],
          headers: headers as HandlerContext<T>["headers"],
          cookies: cookies as HandlerContext<T>["cookies"],
        });

        return autoResponse(result);
      } catch (error) {
        if (error instanceof Error && error.message.includes("验证失败")) {
          return handleValidationError(error);
        }
        return handleInternalError(error);
      }
    };
  };
}

/**
 * 创建带额外上下文的路由处理器
 *
 * 用于中间件注入额外数据的场景
 *
 * @example
 * ```typescript
 * // 定义中间件注入的类型
 * type AuthContext = {
 *   user: { id: string; role: string };
 * };
 *
 * // 创建带类型的处理器
 * const handler = createHandlerWithExtra<AuthContext>()({
 *   body: Type.Object({ action: Type.String() })
 * })(({ body, user }) => {
 *   // body: { action: string }
 *   // user: { id: string; role: string }
 *   return { success: true, userId: user.id };
 * });
 * ```
 */
export function createHandlerWithExtra<
  TExtra extends Record<string, unknown> = Record<string, never>,
>() {
  return <const T extends RouteSchema>(schema: T) => {
    // 预编译 schema
    if (
      schema.body ||
      schema.query ||
      schema.params ||
      schema.headers ||
      schema.cookies
    ) {
      precompileSchemasUltra(schema);
    }

    return <R>(
      handler: (ctx: HandlerContextWithExtra<T, TExtra>) => R | Promise<R>,
    ): ((req: Request) => Promise<Response>) => {
      return async (req: Request): Promise<Response> => {
        try {
          // 解析请求数据
          const query = parseQuery(req);
          const headers = parseHeaders(req);
          const cookies = parseCookies(req);
          const params =
            ((req as unknown as Record<string, unknown>).params as Record<
              string,
              string
            >) || {};

          // 解析请求体
          let body: unknown = undefined;
          if (req.method !== "GET" && req.method !== "HEAD") {
            const [, parsedBody] = await goAwait(parseBody(req));
            body = parsedBody;
          }

          // 验证 schema
          const data = { body, query, params, headers, cookies };
          if (
            schema.body ||
            schema.query ||
            schema.params ||
            schema.headers ||
            schema.cookies
          ) {
            validateAllSchemasUltra(schema, data);
          }

          // 获取中间件注入的额外数据
          const extras = ((req as unknown as Record<string, unknown>)
            .__locals ?? {}) as TExtra;

          // 调用 handler
          const result = await handler({
            req,
            body: body as HandlerContext<T>["body"],
            query: query as HandlerContext<T>["query"],
            params: params as HandlerContext<T>["params"],
            headers: headers as HandlerContext<T>["headers"],
            cookies: cookies as HandlerContext<T>["cookies"],
            ...extras,
          } as HandlerContextWithExtra<T, TExtra>);

          return autoResponse(result);
        } catch (error) {
          if (error instanceof Error && error.message.includes("验证失败")) {
            return handleValidationError(error);
          }
          return handleInternalError(error);
        }
      };
    };
  };
}

/**
 * 简单的路由处理器 (无 schema 验证)
 *
 * @example
 * ```typescript
 * const handler = simpleHandler(({ req }) => {
 *   return { message: "Hello World" };
 * });
 * ```
 */
export function simpleHandler<R>(
  handler: (ctx: { req: Request }) => R | Promise<R>,
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    try {
      const result = await handler({ req });
      return autoResponse(result);
    } catch (error) {
      return handleInternalError(error);
    }
  };
}
