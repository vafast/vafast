/**
 * Schema 验证器 - 简洁版
 *
 * 特点：
 * - WeakMap 缓存避免内存泄漏
 * - TypeCompiler JIT 编译，性能最佳
 * - 支持 FormatRegistry（需确保同一实例）
 *
 * @version 7.0.0
 */

import { Type } from "@sinclair/typebox";
import type { Static, TSchema } from "@sinclair/typebox";
import { TypeCompiler, type TypeCheck } from "@sinclair/typebox/compiler";
import type { ValueError } from "@sinclair/typebox/errors";
import {
  createErrorDetail,
  pathToField,
  ValidationFailedError,
  type ErrorDetail,
  type SchemaLocation,
} from "./validation-errors";

// ============== 类型定义 ==============

/** Schema 配置接口 */
export interface SchemaConfig {
  body?: TSchema;
  query?: TSchema;
  params?: TSchema;
  headers?: TSchema;
  cookies?: TSchema;
}

/** 验证错误接口（validateSchema 返回值） */
export interface ValidationError {
  path: string;
  field: string;
  message: string;
  value?: unknown;
}

/** 验证结果 */
export type ValidationResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; errors: ValidationError[] };

// ============== 缓存 ==============

/** 编译器缓存 - WeakMap 避免内存泄漏 */
const compilerCache = new WeakMap<TSchema, TypeCheck<TSchema>>();

// ============== 核心函数 ==============

/**
 * 获取或创建编译后的验证器
 */
function getCompiledValidator<T extends TSchema>(schema: T): TypeCheck<T> {
  let compiler = compilerCache.get(schema);
  if (!compiler) {
    compiler = TypeCompiler.Compile(schema);
    compilerCache.set(schema, compiler);
  }
  return compiler as TypeCheck<T>;
}

/** 收集单个 schema 的校验错误 */
function collectSchemaErrors(
  schema: TSchema,
  data: unknown,
): ValueError[] {
  const compiler = getCompiledValidator(schema);
  if (compiler.Check(data)) {
    return [];
  }

  return [...compiler.Errors(data)];
}

function valueErrorToValidationError(error: ValueError): ValidationError {
  return {
    path: error.path,
    field: pathToField(error.path),
    message: error.message,
    ...(error.value !== undefined ? { value: error.value } : {}),
  };
}

/**
 * 验证单个 Schema（返回结果对象）
 */
export function validateSchema<T extends TSchema>(
  schema: T,
  data: unknown,
): ValidationResult<Static<T>> {
  try {
    const errors = collectSchemaErrors(schema, data);
    if (errors.length === 0) {
      return { success: true, data: data as Static<T> };
    }
    return { success: false, errors: errors.map(valueErrorToValidationError) };
  } catch (error) {
    return {
      success: false,
      errors: [
        {
          path: "",
          field: "",
          message: error instanceof Error ? error.message : "验证异常",
        },
      ],
    };
  }
}

/**
 * 验证 Schema（抛出 ValidationFailedError）
 */
export function validateSchemaOrThrow<T extends TSchema>(
  schema: T,
  data: unknown,
  location: SchemaLocation,
): Static<T> {
  const rawErrors = collectSchemaErrors(schema, data);
  if (rawErrors.length > 0) {
    const details = rawErrors.map((e) => createErrorDetail(location, e));
    throw new ValidationFailedError(details);
  }

  return data as Static<T>;
}

/**
 * 快速验证（只返回布尔值）
 */
export function validateFast<T extends TSchema>(
  schema: T,
  data: unknown,
): data is Static<T> {
  const compiler = getCompiledValidator(schema);
  return compiler.Check(data);
}

/**
 * 批量验证所有 Schema（用于请求验证）
 * 失败时抛出 ValidationFailedError（422 + details）
 */
export function validateAllSchemas(
  config: SchemaConfig,
  data: {
    body: unknown;
    query: unknown;
    params: unknown;
    headers: unknown;
    cookies: unknown;
  },
): typeof data {
  const details: ErrorDetail[] = [];

  const checks: Array<[SchemaLocation, TSchema | undefined, unknown]> = [
    ["body", config.body, data.body],
    ["query", config.query, data.query],
    ["params", config.params, data.params],
    ["headers", config.headers, data.headers],
    ["cookies", config.cookies, data.cookies],
  ];

  for (const [location, schema, value] of checks) {
    if (!schema) continue;

    const rawErrors = collectSchemaErrors(schema, value);
    for (const e of rawErrors) {
      details.push(createErrorDetail(location, e));
    }
  }

  if (details.length > 0) {
    throw new ValidationFailedError(details);
  }

  return data;
}

/**
 * 预编译 Schema（启动时调用，避免首次请求开销）
 */
export function precompileSchemas(config: SchemaConfig): void {
  if (config.body) getCompiledValidator(config.body);
  if (config.query) getCompiledValidator(config.query);
  if (config.params) getCompiledValidator(config.params);
  if (config.headers) getCompiledValidator(config.headers);
  if (config.cookies) getCompiledValidator(config.cookies);
}

/**
 * 创建类型特化的验证器（高频使用场景）
 */
export function createValidator<T extends TSchema>(
  schema: T,
): (data: unknown) => ValidationResult<Static<T>> {
  return (data: unknown) => validateSchema(schema, data);
}

/**
 * 获取缓存统计（调试用）
 */
export function getValidatorCacheStats(): { cacheType: string; note: string } {
  return {
    cacheType: "WeakMap",
    note: "WeakMap 缓存会随 Schema 对象自动清理，无内存泄漏风险",
  };
}

// 导出 TypeBox 类型
export { Type, Static, TSchema };
