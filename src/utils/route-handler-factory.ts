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

import { parseQuery, parseHeaders, parseCookies, parseBody } from "./parsers";
import { goAwait } from "./go-await";
import { json } from "./response";
import {
  validateAllSchemasUltra,
  precompileSchemasUltra,
  type SchemaConfig,
} from "./validators/schema-validators-ultra";
import type { Static } from "@sinclair/typebox";

// 类型推导的配置接口
export interface TypedConfig extends SchemaConfig {
  docs?: any;
  timeout?: number;
  maxBodySize?: string;
  // 验证错误处理配置
  validationErrorHandler?: ValidationErrorHandler;
  [key: string]: any;
}

// 验证错误处理器类型
export type ValidationErrorHandler = (
  error: Error,
  field: string,
  value: any,
  schema: any
) => Response | Promise<Response>;

// 默认验证错误处理器
const defaultValidationErrorHandler: ValidationErrorHandler = (
  error,
  field,
  value,
  schema
) => {
  return json(
    {
      success: false,
      error: "Validation Error",
      message: error instanceof Error ? error.message : "验证失败",
      field,
      receivedValue: value,
      timestamp: new Date().toISOString(),
    },
    400
  );
};

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

// 预定义的常用响应头，避免重复创建
const TEXT_HEADERS = { "Content-Type": "text/plain; charset=utf-8" };
const JSON_HEADERS = { "Content-Type": "application/json" };
const EMPTY_RESPONSE_204 = new Response(null, { status: 204 });

// 超高性能的 Response 自动转换函数 - 生产环境推荐使用
function autoResponseUltra(result: any): Response {
  // 快速路径：已经是 Response 对象
  if (result instanceof Response) {
    return result;
  }

  // 快速路径：null/undefined - 复用预创建的对象
  if (result === null || result === undefined) {
    return EMPTY_RESPONSE_204;
  }

  // 使用 switch 语句优化类型检查
  switch (typeof result) {
    case "string":
      // 优化：复用预定义的头部对象
      return new Response(result, { headers: TEXT_HEADERS });

    case "number":
    case "boolean":
      // 优化：使用更高效的字符串转换，复用头部
      return new Response(result.toString(), { headers: TEXT_HEADERS });

    case "object":
      // 检查是否是 { data, status, headers } 格式
      if ("data" in result) {
        const { data, status = 200, headers = {} } = result;

        // 无内容
        if (data === null || data === undefined) {
          return new Response("", {
            status: status === 200 ? 204 : status,
            headers,
          });
        }

        // 纯文本类型
        if (
          typeof data === "string" ||
          typeof data === "number" ||
          typeof data === "boolean"
        ) {
          // 优化：减少对象展开操作，直接构建最终对象
          const finalHeaders = {
            "Content-Type": "text/plain; charset=utf-8",
            ...headers,
          };
          return new Response(data.toString(), {
            status,
            headers: finalHeaders,
          });
        }

        // JSON 类型 - 复用 json 函数
        return json(data, status, headers);
      }

      // 普通对象/数组，复用 json 函数
      return json(result);

    default:
      // 其他类型（如 symbol, function 等）
      return EMPTY_RESPONSE_204;
  }
}

// 创建路由处理器的通用函数
export function createRouteHandler<
  TConfig extends TypedConfig,
  TBody = TConfig extends { body: any } ? Static<TConfig["body"]> : any,
  TQuery = TConfig extends { query: any } ? Static<TConfig["query"]> : any,
  TParams = TConfig extends { params: any } ? Static<TConfig["params"]> : any,
  THeaders = TConfig extends { headers: any }
    ? Static<TConfig["headers"]>
    : any,
  TCookies = TConfig extends { cookies: any }
    ? Static<TConfig["cookies"]>
    : any,
  TExtra extends object = {}
>(
  handler: TypedHandler<TBody, TQuery, TParams, THeaders, TCookies, TExtra>,
  config: TConfig = {} as TConfig
) {
  // 检查哪些验证器是必需的
  const hasBodySchema = config.body !== undefined;
  const hasQuerySchema = config.query !== undefined;
  const hasParamsSchema = config.params !== undefined;
  const hasHeadersSchema = config.headers !== undefined;
  const hasCookiesSchema = config.cookies !== undefined;

  // 只在有验证器时预编译Schema
  if (
    hasBodySchema ||
    hasQuerySchema ||
    hasParamsSchema ||
    hasHeadersSchema ||
    hasCookiesSchema
  ) {
    precompileSchemasUltra(config);
  }

  // 获取验证错误处理器
  const errorHandler =
    config.validationErrorHandler || defaultValidationErrorHandler;

  return async (req: Request) => {
    try {
      let queryObj: TQuery = {} as TQuery;
      let headers: THeaders = {} as THeaders;
      let cookies: TCookies = {} as TCookies;
      let body: TBody = undefined as TBody;
      let params: TParams = {} as TParams;

      // 默认总是解析所有数据，只有在有验证器时才进行验证
      queryObj = parseQuery(req) as TQuery;
      headers = parseHeaders(req) as THeaders;
      cookies = parseCookies(req) as TCookies;

      // 总是解析 body
      const [, parsedBody] = await goAwait(parseBody(req));
      body = parsedBody as TBody;

      // 总是尝试获取路径参数
      params = ((req as any).pathParams ||
        (req as any).params ||
        {}) as TParams;

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
      return autoResponseUltra(result);
    } catch (error) {
      // 使用用户自定义的验证错误处理器
      if (error instanceof Error && error.message.includes("验证失败")) {
        // 尝试提取字段信息
        const field = extractFieldFromError(error);
        const value = extractValueFromError(error);
        const schema = extractSchemaFromError(error);

        return await errorHandler(error, field, value, schema);
      }

      // 其他错误使用默认处理
      return json(
        {
          success: false,
          error: "Internal Error",
          message: error instanceof Error ? error.message : "未知错误",
        },
        500
      );
    }
  };
}

// 从错误中提取字段信息的辅助函数
function extractFieldFromError(error: Error): string {
  // 尝试从错误消息中提取字段名
  const fieldMatch = error.message.match(/字段\s*(\w+)/);
  return fieldMatch ? fieldMatch[1] : "unknown";
}

// 从错误中提取值的辅助函数
function extractValueFromError(error: Error): any {
  // 这里可以根据实际错误类型提取值
  return undefined;
}

// 从错误中提取Schema的辅助函数
function extractSchemaFromError(error: Error): any {
  // 这里可以根据实际错误类型提取Schema
  return undefined;
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
    >(handler, config);
  };
}
