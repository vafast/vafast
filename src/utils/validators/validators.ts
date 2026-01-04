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
import { Value } from "@sinclair/typebox/value";

// ============== 类型定义 ==============

/** Schema 配置接口 */
export interface SchemaConfig {
  body?: TSchema;
  query?: TSchema;
  params?: TSchema;
  headers?: TSchema;
  cookies?: TSchema;
}

/** 验证错误接口 */
export interface ValidationError {
  path: string;
  message: string;
  code: string;
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

/**
 * 验证单个 Schema（返回结果对象）
 */
export function validateSchema<T extends TSchema>(
  schema: T,
  data: unknown,
): ValidationResult<Static<T>> {
  try {
    const compiler = getCompiledValidator(schema);

    if (compiler.Check(data)) {
      return { success: true, data: data as Static<T> };
    }

    // 收集错误
    const errors: ValidationError[] = [];
    for (const error of compiler.Errors(data)) {
      errors.push({
        path: error.path,
        message: error.message,
        code: "VALIDATION_FAILED",
        value: error.value,
      });
    }
    return { success: false, errors };
  } catch (error) {
    return {
      success: false,
      errors: [
        {
          path: "",
          message: error instanceof Error ? error.message : "验证异常",
          code: "VALIDATION_EXCEPTION",
        },
      ],
    };
  }
}

/**
 * 验证 Schema（抛出异常版本，用于框架内部）
 */
export function validateSchemaOrThrow<T extends TSchema>(
  schema: T,
  data: unknown,
  context: string,
): Static<T> {
  const compiler = getCompiledValidator(schema);

  if (!compiler.Check(data)) {
    throw new Error(`${context}验证失败`);
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
  if (config.body) {
    validateSchemaOrThrow(config.body, data.body, "请求体");
  }
  if (config.query) {
    validateSchemaOrThrow(config.query, data.query, "Query参数");
  }
  if (config.params) {
    validateSchemaOrThrow(config.params, data.params, "路径参数");
  }
  if (config.headers) {
    validateSchemaOrThrow(config.headers, data.headers, "请求头");
  }
  if (config.cookies) {
    validateSchemaOrThrow(config.cookies, data.cookies, "Cookie");
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
