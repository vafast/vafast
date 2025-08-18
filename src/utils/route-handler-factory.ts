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
import { Middleware } from "../types";
import type { Static } from "@sinclair/typebox";

// 类型推导的配置接口
export interface TypedConfig extends SchemaConfig {
  middleware?: Middleware[];
  docs?: any;
  timeout?: number;
  maxBodySize?: string;
  [key: string]: any;
}

// 类型推导的处理器类型 - 现在可以返回任何类型，会自动转换
export type TypedHandler<
  TBody = any,
  TQuery = any,
  TParams = any,
  THeaders = any,
  TCookies = any
> = (
  req: Request,
  body: TBody,
  query: TQuery,
  params: TParams,
  headers: THeaders,
  cookies: TCookies
) => Response | Promise<Response> | any | Promise<any>;

// 自动转换返回值为 Response 的辅助函数
function autoResponse(result: any): Response {
  if (result instanceof Response) {
    return result;
  }

  if (typeof result === "string") {
    return new Response(result, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  if (typeof result === "number") {
    return new Response(result.toString(), {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  if (typeof result === "boolean") {
    return new Response(result.toString(), {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // null/undefined → 204，无内容
  if (result === null || result === undefined) {
    return new Response("", { status: 204 });
  }

  // 对象、数组等 JSON 类型
  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

// 创建路由处理器的通用函数
export function createRouteHandler<
  TConfig extends TypedConfig,
  TBody = TConfig extends { body: any } ? Static<TConfig["body"]> : any,
  TQuery = TConfig extends { query: any } ? Static<TConfig["query"]> : any,
  TParams = TConfig extends { params: any } ? Static<TConfig["params"]> : any,
  THeaders = TConfig extends { headers: any } ? Static<TConfig["headers"]> : any,
  TCookies = TConfig extends { cookies: any } ? Static<TConfig["cookies"]> : any
>(config: TConfig, handler: TypedHandler<TBody, TQuery, TParams, THeaders, TCookies>) {
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

      // 调用处理器，传递必要的数据
      const result = await handler(req, body, queryObj, params, headers, cookies);
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
