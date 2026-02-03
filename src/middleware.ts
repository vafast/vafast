// src/middleware.ts

import { json, mapResponse } from "./utils/response";

import type { Handler, Middleware } from "./types";

/**
 * 全局 Symbol 标识 VafastError
 *
 * 使用 Symbol.for() 确保跨包共享同一个 Symbol 引用，
 * 彻底解决多包实例 instanceof 失效的问题。
 */
export const VAFAST_ERROR_SYMBOL = Symbol.for("vafast.error");

/** Vafast 自定义错误类型 */
export class VafastError extends Error {
  /** 全局标识，用于跨包识别 */
  readonly [VAFAST_ERROR_SYMBOL] = true;

  status: number;
  code: number;
  expose: boolean;

  constructor(
    message: string,
    options: {
      status?: number;
      code?: number;
      expose?: boolean;
      cause?: unknown;
    } = {},
  ) {
    super(message);
    this.name = "VafastError";
    this.status = options.status ?? 500;
    this.code = options.code ?? options.status ?? 500;
    this.expose = options.expose ?? false;
    if (options.cause) (this as any).cause = options.cause;
  }
}

/** 检查是否是 VafastError（跨包安全） */
export function isVafastError(err: unknown): err is VafastError {
  return (
    err instanceof VafastError ||
    (typeof err === "object" &&
      err !== null &&
      (err as any)[VAFAST_ERROR_SYMBOL] === true)
  );
}

/**
 * 组合中间件链
 *
 * 纯粹的中间件组合，不自动注入任何中间件。
 * 错误处理器由 Server 在适当位置注入，确保洋葱模型正确：
 *
 * ```
 * CORS.before → errorHandler.try → auth → handler
 *                                    ↓ (error)
 *                errorHandler.catch → return errorResponse
 * CORS.after (添加 CORS 头) ← errorResponse
 * ```
 */
export function composeMiddleware(
  middleware: Middleware[],
  finalHandler: Handler,
): (req: Request) => Promise<Response> {
  return function composedHandler(req: Request): Promise<Response> {
    let i = -1;

    const dispatch = (index: number): Promise<Response> => {
      if (index <= i)
        return Promise.reject(new Error("next() called multiple times"));
      i = index;

      // 中间件阶段
      if (index < middleware.length) {
        const mw = middleware[index];
        return Promise.resolve(mw(req, () => dispatch(index + 1)));
      }

      // 最终 handler - 使用 mapResponse 转换返回值
      return Promise.resolve(finalHandler(req)).then(mapResponse);
    };

    return dispatch(0);
  };
}

/**
 * 全局错误处理中间件
 *
 * 捕获后续中间件和 handler 抛出的所有错误，转换为标准 JSON 响应。
 * 由 Server 自动注入到全局中间件之后、路由中间件之前。
 */
export const errorHandler: Middleware = async (req, next) => {
  try {
    return await next();
  } catch (err) {
    console.error("未处理的错误:", err);

    // 使用 Symbol.for() 跨包安全识别 VafastError
    if (isVafastError(err)) {
      return json(
        {
          code: err.code,
          message: err.expose ? err.message : "发生了一个错误",
        },
        err.status,
      );
    }

    return json({ code: 500, message: "出现了一些问题" }, 500);
  }
};
