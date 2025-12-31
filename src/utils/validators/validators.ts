// src/utils/validators.ts
/**
 * 高性能 Schema 验证器
 *
 * 使用 TypeBox TypeCompiler 进行 JIT 编译
 * 编译后的验证器会被缓存，避免重复编译开销
 *
 * @version 2.0.0 - 添加预编译缓存
 */

import { Type } from "@sinclair/typebox";
import type { Static, TSchema } from "@sinclair/typebox";
import { TypeCompiler, type TypeCheck } from "@sinclair/typebox/compiler";

/** 验证错误接口 */
export interface ValidationError {
  path: string;
  message: string;
  code: string;
  value?: unknown;
  schema?: unknown;
}

/** 验证失败结果接口 */
export interface ValidationFailure {
  success: false;
  errors: ValidationError[];
}

/** 验证成功结果接口 */
export interface ValidationSuccess<T> {
  success: true;
  data: T;
}

/** 验证结果联合类型 */
export type ValidationResult<T = unknown> =
  | ValidationSuccess<T>
  | ValidationFailure;

/**
 * 编译器缓存
 * 使用 WeakMap 避免内存泄漏（Schema 对象被垃圾回收时，缓存也会自动清理）
 */
const compilerCache = new WeakMap<TSchema, TypeCheck<TSchema>>();

/**
 * 获取或创建编译后的验证器
 * @param schema TypeBox Schema
 * @returns 编译后的验证器
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
 * 预编译 Schema（在启动时调用，避免首次请求的编译开销）
 * @param schemas 要预编译的 Schema 数组
 */
export function precompileSchemas(schemas: TSchema[]): void {
  for (const schema of schemas) {
    getCompiledValidator(schema);
  }
}

/**
 * 使用TypeBox Schema验证数据（带缓存优化）
 * @param schema TypeBox Schema
 * @param data 要验证的数据
 * @returns 验证结果，包含类型安全的数据或详细错误信息
 */
export function validateSchema<T extends TSchema>(
  schema: T,
  data: unknown,
): ValidationResult<Static<T>> {
  try {
    // 从缓存获取或编译验证器
    const compiler = getCompiledValidator(schema);

    if (compiler.Check(data)) {
      return {
        success: true,
        data: data as Static<T>,
      };
    }

    // 验证失败时，使用Errors函数生成详细的错误信息
    const errors: ValidationError[] = [];
    const errorIterator = compiler.Errors(data);

    // 收集所有错误（可以根据需要限制数量）
    for (const error of errorIterator) {
      errors.push({
        path: error.path,
        message: error.message,
        code: "VALIDATION_FAILED",
        value: error.value,
        schema: error.schema,
      });
    }

    return {
      success: false,
      errors,
    };
  } catch (error) {
    // 处理验证过程中的异常
    return {
      success: false,
      errors: [
        {
          path: "",
          message:
            error instanceof Error ? error.message : "Unknown validation error",
          code: "VALIDATION_EXCEPTION",
          value: data,
        },
      ],
    };
  }
}

/**
 * 创建类型特化的验证器（最高性能）
 * 适用于频繁验证同一 Schema 的场景
 * @param schema TypeBox Schema
 * @returns 类型安全的验证函数
 */
export function createValidator<T extends TSchema>(
  schema: T,
): (data: unknown) => ValidationResult<Static<T>> {
  const compiler = getCompiledValidator(schema);

  return (data: unknown): ValidationResult<Static<T>> => {
    if (compiler.Check(data)) {
      return { success: true, data: data as Static<T> };
    }

    const errors: ValidationError[] = [];
    for (const error of compiler.Errors(data)) {
      errors.push({
        path: error.path,
        message: error.message,
        code: "VALIDATION_FAILED",
        value: error.value,
        schema: error.schema,
      });
    }
    return { success: false, errors };
  };
}

/**
 * 快速验证（只返回布尔值，不收集错误）
 * 适用于只需要知道验证结果的场景
 * @param schema TypeBox Schema
 * @param data 要验证的数据
 * @returns 验证是否通过
 */
export function validateFast<T extends TSchema>(
  schema: T,
  data: unknown,
): data is Static<T> {
  const compiler = getCompiledValidator(schema);
  return compiler.Check(data);
}

/**
 * 获取缓存统计信息（用于调试）
 */
export function getValidatorCacheStats(): { cacheType: string; note: string } {
  return {
    cacheType: "WeakMap",
    note: "WeakMap 不支持 size 属性，缓存会随 Schema 对象自动清理",
  };
}

// 导出常用的TypeBox类型，方便使用
export { Type, Static, TSchema };
