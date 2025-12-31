import { parseCookies } from "./parsers";

/** 获取单个 Cookie 值 */
export function getCookie(req: Request, key: string): string | null {
  const cookies = parseCookies(req);
  return cookies[key] || null;
}

/** 生成 Set-Cookie 头 */
export function setCookie(
  key: string,
  value: string,
  options: {
    path?: string;
    httpOnly?: boolean;
    maxAge?: number;
    secure?: boolean;
  } = {},
): string {
  let cookie = `${key}=${encodeURIComponent(value)}`;

  if (options.path) cookie += `; Path=${options.path}`;
  if (options.httpOnly) cookie += `; HttpOnly`;
  if (options.secure) cookie += `; Secure`;
  if (options.maxAge) cookie += `; Max-Age=${options.maxAge}`;

  return cookie;
}

// 提供给中间件写入"局部上下文"的工具函数
export function setLocals<T extends object>(req: Request, extras: T) {
  const target = req as unknown as Record<string, unknown>;
  target.__locals = { ...((target.__locals as object) ?? {}), ...extras };
}

// 获取中间件注入的局部上下文
export function getLocals<T extends object>(req: Request): T {
  const target = req as unknown as Record<string, unknown>;
  return (target.__locals ?? {}) as T;
}
