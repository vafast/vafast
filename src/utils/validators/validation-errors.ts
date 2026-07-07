/**
 * Schema 校验错误契约
 *
 * HTTP 422 + { code: 422, message, details[] }
 * message 直接使用 TypeBox 原始英文，不做翻译或 rule 映射。
 */

import type { ValueError } from "@sinclair/typebox/errors";

/** Schema 校验位置 */
export type SchemaLocation =
  | "body"
  | "query"
  | "params"
  | "headers"
  | "cookies";

/** 单条字段校验错误 */
export interface ErrorDetail {
  location: SchemaLocation;
  /** JSON Pointer 风格路径，如 /email、/receiver/name、/orderIds/1 */
  path: string;
  /** 表单绑字段路径，如 email、receiver.name、orderIds.1 */
  field: string;
  /** TypeBox 原始 message */
  message: string;
  value?: unknown;
}

/** 全局 Symbol，跨包识别 ValidationFailedError */
export const VALIDATION_FAILED_SYMBOL = Symbol.for("vafast.validation_failed");

/** Schema 校验失败错误（422） */
export class ValidationFailedError extends Error {
  readonly [VALIDATION_FAILED_SYMBOL] = true;

  readonly status = 422;
  readonly code = 422;
  readonly details: ErrorDetail[];

  constructor(details: ErrorDetail[], message = "请求参数校验失败") {
    super(message);
    this.name = "ValidationFailedError";
    this.details = details;
  }
}

/** 跨包安全识别 ValidationFailedError */
export function isValidationFailedError(
  err: unknown,
): err is ValidationFailedError {
  return (
    err instanceof ValidationFailedError ||
    (typeof err === "object" &&
      err !== null &&
      (err as Record<symbol, unknown>)[VALIDATION_FAILED_SYMBOL] === true)
  );
}

/** JSON Pointer path → 表单 field 路径 */
export function pathToField(path: string): string {
  if (!path || path === "/") return "";
  return path.startsWith("/")
    ? path.slice(1).replace(/\//g, ".")
    : path.replace(/\//g, ".");
}

/** 从 TypeBox ValueError 构造 ErrorDetail */
export function createErrorDetail(
  location: SchemaLocation,
  error: ValueError,
): ErrorDetail {
  return {
    location,
    path: error.path,
    field: pathToField(error.path),
    message: error.message,
    ...(error.value !== undefined ? { value: error.value } : {}),
  };
}
