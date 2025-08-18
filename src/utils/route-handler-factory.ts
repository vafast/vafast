/**
 * 路由处理器工厂
 *
 * 负责创建和配置路由处理器，处理请求数据解析和验证
 * 提供统一的错误处理和响应格式
 *
 * @author Framework Team
 * @version 1.0.0
 * @license MIT
 */

import { parseQuery, parseHeaders, parseCookies, parseBody, json } from "../util";
import { goAwait } from "./go-await";
import {
  validateAllSchemasUltra,
  precompileSchemasUltra,
  type SchemaConfig,
} from "./validators/validators-ultra";
import type { Static } from "@sinclair/typebox";

// 类型推导的配置接口
export interface TypedConfig extends SchemaConfig {
  docs?: any;
  timeout?: number;
  maxBodySize?: string;
  [key: string]: any;
}

// 类型推导的处理器类型 - 现在使用单参数上下文对象
export type TypedHandler<
  TBody = any,
  TQuery = any,
  TParams = any,
  THeaders = any,
  TCookies = any,
  TExtra extends object = {}
> = (
  ctx: {
    req: Request;
    body: TBody;
    query: TQuery;
    params: TParams;
    headers: THeaders;
    cookies: TCookies;
  } & TExtra
) => Response | Promise<Response> | any | Promise<any>;

// 提供给中间件写入“局部上下文”的工具函数
export function setLocals<T extends object>(req: Request, extras: T) {
  const target = req as any;
  target.__locals = { ...(target.__locals ?? {}), ...extras };
}

// 自动转换返回值为 Response 的辅助函数
function autoResponse(result: any): Response {
  if (result instanceof Response) {
    return result;
  }

  // 支持 { data, status, headers } 格式
  if (result && typeof result === "object" && "data" in result) {
    const {
      data,
      status = 200,
      headers = {},
    } = result as {
      data: any;
      status?: number;
      headers?: HeadersInit;
    };

    const h = new Headers(headers);

    // 无内容
    if (data === null || data === undefined) {
      return new Response("", { status: status ?? 204, headers: h });
    }

    // 纯文本类型
    if (typeof data === "string" || typeof data === "number" || typeof data === "boolean") {
      if (!h.has("Content-Type")) {
        h.set("Content-Type", "text/plain; charset=utf-8");
      }
      return new Response(String(data), { status, headers: h });
    }

    // JSON 类型
    return json(data, status, h);
  }

  // 原有的自动序列化逻辑（向后兼容）
  if (typeof result === "string" || typeof result === "number" || typeof result === "boolean") {
    return new Response(String(result), {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // null/undefined → 204，无内容
  if (result === null || result === undefined) {
    return new Response("", { status: 204 });
  }

  // 对象、数组等 JSON 类型
  return json(result);
}

// 创建路由处理器的通用函数
export function createRouteHandler<
  TConfig extends TypedConfig,
  TBody = TConfig extends { body: any } ? Static<TConfig["body"]> : any,
  TQuery = TConfig extends { query: any } ? Static<TConfig["query"]> : any,
  TParams = TConfig extends { params: any } ? Static<TConfig["params"]> : any,
  THeaders = TConfig extends { headers: any } ? Static<TConfig["headers"]> : any,
  TCookies = TConfig extends { cookies: any } ? Static<TConfig["cookies"]> : any,
  TExtra extends object = {}
>(config: TConfig, handler: TypedHandler<TBody, TQuery, TParams, THeaders, TCookies, TExtra>) {
  // 检查哪些验证器是必需的
  const hasBodySchema = config.body !== undefined;
  const hasQuerySchema = config.query !== undefined;
  const hasParamsSchema = config.params !== undefined;
  const hasHeadersSchema = config.headers !== undefined;
  const hasCookiesSchema = config.cookies !== undefined;

  // 只在有验证器时预编译Schema
  if (hasBodySchema || hasQuerySchema || hasParamsSchema || hasHeadersSchema || hasCookiesSchema) {
    precompileSchemasUltra(config);
  }

  return async (req: Request) => {
    try {
      let queryObj: TQuery = {} as TQuery;
      let headers: THeaders = {} as THeaders;
      let cookies: TCookies = {} as TCookies;
      let body: TBody = undefined as TBody;
      let params: TParams = {} as TParams;

      // 按需解析和验证数据
      if (hasQuerySchema) {
        queryObj = parseQuery(req) as TQuery;
      }

      if (hasHeadersSchema) {
        headers = parseHeaders(req) as THeaders;
      }

      if (hasCookiesSchema) {
        cookies = parseCookies(req) as TCookies;
      }

      if (hasBodySchema) {
        const [, parsedBody] = await goAwait(parseBody(req));
        body = parsedBody as TBody;
      }

      if (hasParamsSchema) {
        // 从 req 的第二个参数获取路径参数，或者从 req.pathParams 获取
        params = ((req as any).pathParams || (req as any).params || {}) as TParams;
      }

      // 只在有验证器时执行验证
      if (
        hasBodySchema ||
        hasQuerySchema ||
        hasParamsSchema ||
        hasHeadersSchema ||
        hasCookiesSchema
      ) {
        const data = { body, query: queryObj, params, headers, cookies };
        validateAllSchemasUltra(config, data);
      }

      // 合并中间件注入的本地上下文
      const extras = ((req as any).__locals ?? {}) as TExtra;

      // 调用处理器，传递上下文
      const result = await handler({
        req,
        body,
        query: queryObj,
        params,
        headers,
        cookies,
        ...(extras as object),
      } as unknown as {
        req: Request;
        body: TBody;
        query: TQuery;
        params: TParams;
        headers: THeaders;
        cookies: TCookies;
      } & TExtra);
      return autoResponse(result);
    } catch (error) {
      // 返回验证错误响应
      return json(
        {
          success: false,
          error: "Validation Error",
          message: error instanceof Error ? error.message : "验证失败",
        },
        400
      );
    }
  };
}

export function withExtra<TExtra extends object = {}>() {
  return function withExtraHandler<TConfig extends TypedConfig>(
    config: TConfig,
    handler: TypedHandler<
      TConfig extends { body: any } ? Static<TConfig["body"]> : any,
      TConfig extends { query: any } ? Static<TConfig["query"]> : any,
      TConfig extends { params: any } ? Static<TConfig["params"]> : any,
      TConfig extends { headers: any } ? Static<TConfig["headers"]> : any,
      TConfig extends { cookies: any } ? Static<TConfig["cookies"]> : any,
      TExtra
    >
  ) {
    return createRouteHandler<
      TConfig,
      TConfig extends { body: any } ? Static<TConfig["body"]> : any,
      TConfig extends { query: any } ? Static<TConfig["query"]> : any,
      TConfig extends { params: any } ? Static<TConfig["params"]> : any,
      TConfig extends { headers: any } ? Static<TConfig["headers"]> : any,
      TConfig extends { cookies: any } ? Static<TConfig["cookies"]> : any,
      TExtra
    >(config, handler);
  };
}
