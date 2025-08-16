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

// 类型推导的配置接口
export interface TypedConfig extends SchemaConfig {
  middleware?: Middleware[];
  docs?: any;
  timeout?: number;
  maxBodySize?: string;
  [key: string]: any;
}

// 类型推导的处理器类型
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
) => Response | Promise<Response>;

// 创建路由处理器的通用函数
export function createRouteHandler<TConfig extends TypedConfig>(
  config: TConfig,
  handler: TypedHandler<any, any, any, any, any>
) {
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
      let queryObj: any = {};
      let headers: any = {};
      let cookies: any = {};
      let body: any = undefined;
      let params: any = {};

      // 按需解析和验证数据
      if (hasQuerySchema) {
        const queryObj = parseQuery(req);
      }

      if (hasHeadersSchema) {
        headers = parseHeaders(req);
      }

      if (hasCookiesSchema) {
        cookies = parseCookies(req);
      }

      if (hasBodySchema) {
        const [, parsedBody] = await goAwait(parseBody(req));
        body = parsedBody;
      }

      if (hasParamsSchema) {
        // 从 req 的第二个参数获取路径参数，或者从 req.pathParams 获取
        params = (req as any).pathParams || (req as any).params || {};
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
      return handler(req, body, queryObj, params, headers, cookies);
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
