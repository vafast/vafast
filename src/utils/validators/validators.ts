// src/utils/validators.ts
import { Type } from "@sinclair/typebox";
import type { Static, TSchema } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

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
 * 使用TypeBox Schema验证数据
 * @param schema TypeBox Schema
 * @param data 要验证的数据
 * @returns 验证结果，包含类型安全的数据或详细错误信息
 */
export function validateSchema<T extends TSchema>(
  schema: T,
  data: unknown,
): ValidationResult<Static<T>> {
  try {
    // 使用TypeBox的TypeCompiler进行验证
    const compiler = TypeCompiler.Compile(schema);

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

// 导出常用的TypeBox类型，方便使用
export { Type, Static, TSchema };
