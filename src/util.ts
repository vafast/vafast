// src/util.ts
import qs from "qs";
import cookie from "cookie";

export function json(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  const h = new Headers({
    "Content-Type": "application/json",
    ...headers,
  });

  return new Response(JSON.stringify(data), {
    status,
    headers: h,
  });
}

/** 生成重定向响应 */
export function redirect(location: string, status: 301 | 302 = 302): Response {
  return new Response(null, {
    status,
    headers: {
      Location: location,
    },
  });
}

/** 解析请求体（JSON / URL编码） */
export async function parseBody(req: Request): Promise<unknown> {
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return await req.json();
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await req.text();
    return Object.fromEntries(new URLSearchParams(text));
  }

  return await req.text(); // 默认返回
}

/** 获取查询字符串，直接返回对象 */
export function parseQuery(req: Request): Record<string, any> {
  const url = new URL(req.url);
  return qs.parse(url.search.slice(1)); // 去掉开头的 ?
}
/** 解析请求头，返回对象 */
export function parseHeaders(req: Request): Record<string, string> {
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    if (value !== undefined && value !== null) {
      headers[key] = value;
    }
  });
  return headers;
}

/** 使用cookie库解析Cookie，保证可靠性 */
export function parseCookies(req: Request): Record<string, string> {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return {};

  try {
    const parsed = cookie.parse(cookieHeader);
    // 过滤掉undefined和null值
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (value !== undefined && value !== null) {
        result[key] = value;
      }
    }
    return result;
  } catch (error) {
    console.error("Cookie解析失败:", error);
    console.error("原始Cookie字符串:", cookieHeader);
    return {};
  }
}
