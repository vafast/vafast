// src/middleware.ts

import { json } from "./util";

import type { Handler, Middleware } from "./types";
/** 中间件类型：使用 next() 传递给下一个处理 */

/** Vafast 自定义错误类型 */
export class VafastError extends Error {
  status: number;
  type: string;
  expose: boolean;

  constructor(
    message: string,
    options: {
      status?: number;
      type?: string;
      expose?: boolean;
      cause?: unknown;
    } = {}
  ) {
    super(message);
    this.name = "VafastError";
    this.status = options.status ?? 500;
    this.type = options.type ?? "internal_error";
    this.expose = options.expose ?? false;
    if (options.cause) (this as any).cause = options.cause;
  }
}

/**
 * 组合类型: 自动注入错误处理器进行中间件组合
 */
export function composeMiddleware(middleware: Middleware[], finalHandler: Handler): Handler {
  const all = [errorHandler, ...middleware];

  return function composedHandler(req: Request): Promise<Response> {
    let i = -1;

    const dispatch = (index: number): Promise<Response> => {
      if (index <= i) return Promise.reject(new Error("next() called multiple times"));
      i = index;
      const fn = index < all.length ? all[index] : finalHandler;
      return Promise.resolve(
        fn(req, (() => dispatch(index + 1)) as unknown as Record<string, string> &
          (() => Promise<Response>))
      );
    };

    return dispatch(0);
  };
}

/** 默认包含的全局错误处理器 */
const errorHandler: Middleware = async (req, next) => {
  try {
    return await next();
  } catch (err) {
    console.error("未处理的错误:", err);

    if (err instanceof VafastError) {
      return json(
        {
          error: err.type,
          message: err.expose ? err.message : "发生了一个错误",
        },
        err.status
      );
    }

    return json({ error: "internal_error", message: "出现了一些问题" }, 500);
  }
};
