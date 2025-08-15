// src/cookie.ts（带日志）
export function getCookie(req: Request, key: string): string | null {
  const cookie = req.headers.get("cookie");
  console.log("[Vafast] 接收到的 Cookie:", cookie); // ✅ 已添加

  if (!cookie) return null;

  const pairs = cookie.split(";").map((c) => c.trim().split("="));
  for (const [k, v] of pairs) {
    if (k === key) {
      console.log(`[Vafast] 匹配的 Cookie: ${k}=${v}`); // ✅ 已添加
      return decodeURIComponent(v);
    }
  }

  console.log("[Vafast] 没有匹配的 cookie 键:", key);
  return null;
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
  } = {}
): string {
  let cookie = `${key}=${encodeURIComponent(value)}`;

  if (options.path) cookie += `; Path=${options.path}`;
  if (options.httpOnly) cookie += `; HttpOnly`;
  if (options.secure) cookie += `; Secure`;
  if (options.maxAge) cookie += `; Max-Age=${options.maxAge}`;

  return cookie;
}
