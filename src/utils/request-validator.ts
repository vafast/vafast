/**
 * 请求解析和验证器
 *
 * 解析handler的req参数，使用Ultra验证器进行验证，
 * 并类型安全地返回解析出来的值
 *
 * @author Framework Team
 * @version 1.0.0
 * @license MIT
 */

import type { TSchema } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";
import {
  validateAllSchemasUltra,
  type SchemaConfig,
} from "./validators/schema-validators-ultra";
import { parseBody, parseQuery, parseHeaders, parseCookies } from "./parsers";

// 请求数据结构
export interface RequestData {
  body: unknown;
  query: unknown;
  params: Record<string, string>;
  headers: Record<string, string>;
  cookies: Record<string, string>;
}

// 验证后的请求数据类型
export interface ValidatedRequestData<T extends SchemaConfig> {
  body: T["body"] extends TSchema ? Static<T["body"]> : unknown;
  query: T["query"] extends TSchema ? Static<T["query"]> : unknown;
  params: T["params"] extends TSchema
    ? Static<T["params"]>
    : Record<string, string>;
  headers: T["headers"] extends TSchema
    ? Static<T["headers"]>
    : Record<string, string>;
  cookies: T["cookies"] extends TSchema
    ? Static<T["cookies"]>
    : Record<string, string>;
}

// 验证结果
export interface ValidationResult<T extends SchemaConfig> {
  success: boolean;
  data?: ValidatedRequestData<T>;
  errors?: Array<{ field: keyof SchemaConfig; message: string }>;
}

/**
 * 解析Request对象，提取所有相关数据
 * @param request Request对象
 * @param params 路径参数（可选）
 * @returns 解析后的请求数据
 */
export async function parseRequest(
  request: Request,
  params?: Record<string, string>,
): Promise<RequestData> {
  const requestData: RequestData = {
    body: undefined,
    query: parseQuery(request),
    params: params || {},
    headers: parseHeaders(request),
    cookies: parseCookies(request),
  };

  // 对于非GET请求，尝试解析请求体
  if (request.method !== "GET" && request.method !== "HEAD") {
    requestData.body = await parseBody(request);
  }

  return requestData;
}

/**
 * 验证请求数据
 * @param config Schema配置
 * @param requestData 请求数据
 * @returns 验证结果
 */
export function validateRequest<T extends SchemaConfig>(
  config: T,
  requestData: RequestData,
): ValidationResult<T> {
  try {
    const validatedData = validateAllSchemasUltra(config, requestData);

    return {
      success: true,
      data: validatedData as ValidatedRequestData<T>,
    };
  } catch (error) {
    return {
      success: false,
      errors: [
        {
          field: "unknown" as keyof SchemaConfig,
          message: error instanceof Error ? error.message : "验证失败",
        },
      ],
    };
  }
}

/**
 * 完整的请求解析和验证流程
 * @param request Request对象
 * @param config Schema配置
 * @param params 路径参数（可选）
 * @returns 验证结果
 */
export async function parseAndValidateRequest<T extends SchemaConfig>(
  request: Request,
  config: T,
  params?: Record<string, string>,
): Promise<ValidationResult<T>> {
  try {
    // 1. 解析请求
    const requestData = await parseRequest(request, params);

    // 2. 验证数据
    return validateRequest(config, requestData);
  } catch (error) {
    return {
      success: false,
      errors: [
        {
          field: "unknown" as keyof SchemaConfig,
          message: error instanceof Error ? error.message : "请求解析失败",
        },
      ],
    };
  }
}

/**
 * 创建类型安全的请求验证器工厂
 * @param config Schema配置
 * @returns 验证器函数
 */
export function createRequestValidator<T extends SchemaConfig>(config: T) {
  return async (request: Request, params?: Record<string, string>) => {
    return parseAndValidateRequest(request, config, params);
  };
}
