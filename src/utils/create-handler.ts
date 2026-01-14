/**
 * 类型安全的路由处理器工厂
 *
 * 非柯里化设计，API 更简洁
 *
 * @author Framework Team
 * @version 3.0.0
 * @license MIT
 */

import type {
  RouteSchema,
  HandlerContext,
  HandlerContextWithExtra,
} from "../types/schema";
import { parseBody, parseQuery, parseHeaders, parseCookies } from "./parsers";
import { goAwait } from "./go-await";
import { json } from "./response";
import {
  validateAllSchemas,
  precompileSchemas,
} from "./validators/validators";

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

/** 空 schema 的上下文类型 */
type EmptySchemaContext = {
  req: Request;
  body: unknown;
  query: Record<string, string>;
  params: Record<string, string>;
  headers: Record<string, string>;
  cookies: Record<string, string>;
};

/**
 * 判断是否为 handler 函数
 */
function isHandler(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === "function";
}

/**
 * 创建类型安全的路由处理器
 *
 * @example
 * ```typescript
 * // 无 schema - 直接传入 handler
 * createHandler(({ params }) => `User: ${params.id}`)
 *
 * // 有 schema - 传入 schema 和 handler
 * createHandler(
 *   { body: Type.Object({ name: Type.String() }) },
 *   ({ body }) => ({ hello: body.name })
 * )
 * ```
 */
/**
 * 带类型推断的 Handler - 保留返回类型信息用于客户端类型推断
 */
export type InferableHandler<TReturn, TSchema extends RouteSchema = RouteSchema> = ((req: Request) => Promise<Response>) & {
  /** 返回类型标记（仅用于类型推断，运行时不存在） */
  __returnType: TReturn;
  /** Schema 类型标记 */
  __schema: TSchema;
};


// 重载 1: 无 schema
export function createHandler<R>(
  handler: (ctx: EmptySchemaContext) => R | Promise<R>,
): InferableHandler<R>;

// 重载 2: 有 schema
export function createHandler<const T extends RouteSchema, R>(
  schema: T,
  handler: (ctx: HandlerContext<T>) => R | Promise<R>,
): InferableHandler<R, T>;

// 实现
export function createHandler<const T extends RouteSchema, R>(
  schemaOrHandler: T | ((ctx: EmptySchemaContext) => R | Promise<R>),
  maybeHandler?: (ctx: HandlerContext<T>) => R | Promise<R>,
): InferableHandler<R, T> {
  // 判断调用方式
  const hasSchema = !isHandler(schemaOrHandler);
  const schema = hasSchema ? (schemaOrHandler as T) : ({} as T);
  const handler = hasSchema
    ? maybeHandler!
    : (schemaOrHandler as (ctx: HandlerContext<T>) => R | Promise<R>);

  // 预编译 schema
  if (
    schema.body ||
    schema.query ||
    schema.params ||
    schema.headers ||
    schema.cookies
  ) {
    precompileSchemas(schema);
  }

  const handlerFn = async (req: Request): Promise<Response> => {
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
        validateAllSchemas(schema, data);
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

  // 运行时保存 schema，用于契约生成
  const inferableHandler = handlerFn as InferableHandler<R, T>;
  (inferableHandler as unknown as { __schema: T }).__schema = schema;
  return inferableHandler;
}

/**
 * 创建带额外上下文的路由处理器
 *
 * 用于中间件注入额外数据的场景
 *
 * @example
 * ```typescript
 * // 定义中间件注入的类型
 * type AuthContext = { user: { id: string; role: string } };
 *
 * // 无 schema
 * createHandlerWithExtra<AuthContext>(({ user }) => {
 *   return { userId: user.id };
 * })
 *
 * // 有 schema
 * createHandlerWithExtra<AuthContext>(
 *   { body: Type.Object({ action: Type.String() }) },
 *   ({ body, user }) => ({ success: true, userId: user.id })
 * )
 * ```
 */
// 重载 1: 无 schema
export function createHandlerWithExtra<
  TExtra extends Record<string, unknown> = Record<string, never>,
  R = unknown,
>(
  handler: (ctx: EmptySchemaContext & TExtra) => R | Promise<R>,
): (req: Request) => Promise<Response>;

// 重载 2: 有 schema
export function createHandlerWithExtra<
  TExtra extends Record<string, unknown> = Record<string, never>,
  const T extends RouteSchema = RouteSchema,
  R = unknown,
>(
  schema: T,
  handler: (ctx: HandlerContextWithExtra<T, TExtra>) => R | Promise<R>,
): (req: Request) => Promise<Response>;

// 实现
export function createHandlerWithExtra<
  TExtra extends Record<string, unknown> = Record<string, never>,
  const T extends RouteSchema = RouteSchema,
  R = unknown,
>(
  schemaOrHandler: T | ((ctx: EmptySchemaContext & TExtra) => R | Promise<R>),
  maybeHandler?: (ctx: HandlerContextWithExtra<T, TExtra>) => R | Promise<R>,
): (req: Request) => Promise<Response> {
  // 判断调用方式
  const hasSchema = !isHandler(schemaOrHandler);
  const schema = hasSchema ? (schemaOrHandler as T) : ({} as T);
  const handler = hasSchema
    ? maybeHandler!
    : (schemaOrHandler as (
        ctx: HandlerContextWithExtra<T, TExtra>,
      ) => R | Promise<R>);

  // 预编译 schema
  if (
    schema.body ||
    schema.query ||
    schema.params ||
    schema.headers ||
    schema.cookies
  ) {
    precompileSchemas(schema);
  }

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
        validateAllSchemas(schema, data);
      }

      // 获取中间件注入的额外数据
      const extras = ((req as unknown as Record<string, unknown>).__locals ??
        {}) as TExtra;

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
}

/**
 * 简单的路由处理器 (无 schema 验证，只有 req)
 *
 * @example
 * ```typescript
 * simpleHandler(({ req }) => {
 *   return { message: "Hello World" };
 * })
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
