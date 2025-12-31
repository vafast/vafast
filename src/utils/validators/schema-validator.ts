/**
 * Schema配置验证器
 *
 * 使用validateSchema函数对SchemaConfig结构的数据进行验证
 * 提供统一的验证接口和错误处理
 *
 * @author Framework Team
 * @version 1.0.0
 * @license MIT
 */

import type { TSchema } from "@sinclair/typebox";
import { validateSchema, type ValidationResult } from "./validators";

// 统一的Schema配置接口
export interface SchemaConfig {
  body?: TSchema;
  query?: TSchema;
  params?: TSchema;
  headers?: TSchema;
  cookies?: TSchema;
}

// 请求数据结构接口
export interface RequestData {
  body?: unknown;
  query?: unknown;
  params?: unknown;
  headers?: unknown;
  cookies?: unknown;
}

// 验证结果数据结构
export interface SchemaValidationResult {
  success: boolean;
  data?: {
    body?: unknown;
    query?: unknown;
    params?: unknown;
    headers?: unknown;
    cookies?: unknown;
  };
  errors?: Array<{
    field: keyof SchemaConfig;
    error: ValidationResult<unknown>;
  }>;
}

/**
 * 验证单个Schema配置项
 * @param schema Schema定义
 * @param data 要验证的数据
 * @param fieldName 字段名称（用于错误标识）
 * @returns 验证结果
 */
function validateSingleSchema(
  schema: TSchema,
  data: unknown,
  fieldName: keyof SchemaConfig,
): ValidationResult<unknown> {
  return validateSchema(schema, data);
}

/**
 * 使用SchemaConfig验证完整的请求数据
 * @param config Schema配置
 * @param data 请求数据
 * @returns 验证结果
 */
export function validateSchemaConfig(
  config: SchemaConfig,
  data: RequestData,
): SchemaValidationResult {
  const errors: Array<{
    field: keyof SchemaConfig;
    error: ValidationResult<unknown>;
  }> = [];
  const validatedData: RequestData = {};

  // 验证body
  if (config.body && data.body !== undefined) {
    const result = validateSingleSchema(config.body, data.body, "body");
    if (result.success) {
      validatedData.body = result.data;
    } else {
      errors.push({ field: "body", error: result });
    }
  } else if (data.body !== undefined) {
    validatedData.body = data.body;
  }

  // 验证query
  if (config.query && data.query !== undefined) {
    const result = validateSingleSchema(config.query, data.query, "query");
    if (result.success) {
      validatedData.query = result.data;
    } else {
      errors.push({ field: "query", error: result });
    }
  } else if (data.query !== undefined) {
    validatedData.query = data.query;
  }

  // 验证params
  if (config.params && data.params !== undefined) {
    const result = validateSingleSchema(config.params, data.params, "params");
    if (result.success) {
      validatedData.params = result.data;
    } else {
      errors.push({ field: "params", error: result });
    }
  } else if (data.params !== undefined) {
    validatedData.params = data.params;
  }

  // 验证headers
  if (config.headers && data.headers !== undefined) {
    const result = validateSingleSchema(
      config.headers,
      data.headers,
      "headers",
    );
    if (result.success) {
      validatedData.headers = result.data;
    } else {
      errors.push({ field: "headers", error: result });
    }
  } else if (data.headers !== undefined) {
    validatedData.headers = data.headers;
  }

  // 验证cookies
  if (config.cookies && data.cookies !== undefined) {
    const result = validateSingleSchema(
      config.cookies,
      data.cookies,
      "cookies",
    );
    if (result.success) {
      validatedData.cookies = result.data;
    } else {
      errors.push({ field: "cookies", error: result });
    }
  } else if (data.cookies !== undefined) {
    validatedData.cookies = data.cookies;
  }

  // 添加所有未配置但存在的数据字段
  if (data.body !== undefined && !config.body) {
    validatedData.body = data.body;
  }
  if (data.query !== undefined && !config.query) {
    validatedData.query = data.query;
  }
  if (data.params !== undefined && !config.params) {
    validatedData.params = data.params;
  }
  if (data.headers !== undefined && !config.headers) {
    validatedData.headers = data.headers;
  }
  if (data.cookies !== undefined && !config.cookies) {
    validatedData.cookies = data.cookies;
  }

  // 如果有错误，返回失败结果
  if (errors.length > 0) {
    return {
      success: false,
      errors,
    };
  }

  // 验证成功，返回验证后的数据
  return {
    success: true,
    data: validatedData,
  };
}

/**
 * 异步验证SchemaConfig（支持异步验证器）
 * @param config Schema配置
 * @param data 请求数据
 * @returns Promise<验证结果>
 */
export async function validateSchemaConfigAsync(
  config: SchemaConfig,
  data: RequestData,
): Promise<SchemaValidationResult> {
  const errors: Array<{
    field: keyof SchemaConfig;
    error: ValidationResult<unknown>;
  }> = [];
  const validatedData: RequestData = {};

  // 并行验证所有Schema以提高性能
  const validationPromises: Array<
    Promise<{ field: keyof SchemaConfig; result: ValidationResult<unknown> }>
  > = [];

  // 收集所有需要验证的字段
  if (config.body && data.body !== undefined) {
    validationPromises.push(
      Promise.resolve({
        field: "body" as keyof SchemaConfig,
        result: validateSingleSchema(config.body, data.body, "body"),
      }),
    );
  }
  if (config.query && data.query !== undefined) {
    validationPromises.push(
      Promise.resolve({
        field: "query" as keyof SchemaConfig,
        result: validateSingleSchema(config.query, data.query, "query"),
      }),
    );
  }
  if (config.params && data.params !== undefined) {
    validationPromises.push(
      Promise.resolve({
        field: "params" as keyof SchemaConfig,
        result: validateSingleSchema(config.params, data.params, "params"),
      }),
    );
  }
  if (config.headers && data.headers !== undefined) {
    validationPromises.push(
      Promise.resolve({
        field: "headers" as keyof SchemaConfig,
        result: validateSingleSchema(config.headers, data.headers, "headers"),
      }),
    );
  }
  if (config.cookies && data.cookies !== undefined) {
    validationPromises.push(
      Promise.resolve({
        field: "cookies" as keyof SchemaConfig,
        result: validateSingleSchema(config.cookies, data.cookies, "cookies"),
      }),
    );
  }

  // 等待所有验证完成
  const results = await Promise.all(validationPromises);

  // 处理验证结果
  for (const { field, result } of results) {
    if (result.success) {
      validatedData[field] = result.data;
    } else {
      errors.push({ field, error: result });
    }
  }

  // 添加未验证但存在的数据
  if (data.body !== undefined && !config.body) validatedData.body = data.body;
  if (data.query !== undefined && !config.query)
    validatedData.query = data.query;
  if (data.params !== undefined && !config.params)
    validatedData.params = data.params;
  if (data.headers !== undefined && !config.headers)
    validatedData.headers = data.headers;
  if (data.cookies !== undefined && !config.cookies)
    validatedData.cookies = data.cookies;

  // 如果有错误，返回失败结果
  if (errors.length > 0) {
    return {
      success: false,
      errors,
    };
  }

  // 验证成功，返回验证后的数据
  return {
    success: true,
    data: validatedData,
  };
}

/**
 * 创建验证器工厂函数
 * @param config Schema配置
 * @returns 验证器函数
 */
export function createSchemaValidator(config: SchemaConfig) {
  return (data: RequestData): SchemaValidationResult => {
    return validateSchemaConfig(config, data);
  };
}

/**
 * 创建异步验证器工厂函数
 * @param config Schema配置
 * @returns 异步验证器函数
 */
export function createAsyncSchemaValidator(config: SchemaConfig) {
  return (data: RequestData): Promise<SchemaValidationResult> => {
    return validateSchemaConfigAsync(config, data);
  };
}

// 类型已经在上面定义并导出，无需重复导出
