// src/response.ts

import { VafastError } from "../middleware";

/** 生成 JSON 响应 */
export function json(
  data: unknown,
  status = 200,
  headers: HeadersInit = {},
): Response {
  const body = JSON.stringify(data);

  // 优化：只在有自定义 headers 时才创建 Headers 对象
  if (Object.keys(headers).length === 0) {
    return new Response(body, {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 有自定义 headers 时才创建 Headers 对象
  const h = new Headers({
    "Content-Type": "application/json",
    ...headers,
  });

  return new Response(body, {
    status,
    headers: h,
  });
}

// JSON 响应的预创建 headers（避免每次创建）
const JSON_HEADERS = { "Content-Type": "application/json" };
const TEXT_HEADERS = { "Content-Type": "text/plain" };

/**
 * 类型特化的响应映射
 * 根据返回值类型直接生成 Response，避免不必要的检查
 */
export function mapResponse(response: unknown): Response {
  // 快速路径：已经是 Response
  if (response instanceof Response) return response;

  // 使用 constructor.name 进行类型判断（比 instanceof 更快）
  switch (response?.constructor?.name) {
    case "String":
      return new Response(response as string, { headers: TEXT_HEADERS });

    case "Object":
    case "Array":
      return new Response(JSON.stringify(response), { headers: JSON_HEADERS });

    case "Number":
    case "Boolean":
      return new Response(String(response), { headers: TEXT_HEADERS });

    case undefined:
      // null 或 undefined
      return new Response(null, { status: 204 });

    case "ReadableStream":
      return new Response(response as ReadableStream);

    case "Blob":
      return new Response(response as Blob);

    case "ArrayBuffer":
      return new Response(response as ArrayBuffer);

    case "Uint8Array":
      return new Response(response as unknown as BodyInit);

    default:
      // Promise 处理
      if (response instanceof Promise) {
        return response.then(mapResponse) as unknown as Response;
      }
      // 其他情况使用 JSON 序列化
      return new Response(JSON.stringify(response), { headers: JSON_HEADERS });
  }
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

/** 生成纯文本响应 */
export function text(
  content: string,
  status = 200,
  headers: HeadersInit = {},
): Response {
  const h = new Headers({
    "Content-Type": "text/plain; charset=utf-8",
    ...headers,
  });

  return new Response(content, {
    status,
    headers: h,
  });
}

/** 生成HTML响应 */
export function html(
  content: string,
  status = 200,
  headers: HeadersInit = {},
): Response {
  const h = new Headers({
    "Content-Type": "text/html; charset=utf-8",
    ...headers,
  });

  return new Response(content, {
    status,
    headers: h,
  });
}

/** 生成空响应（204 No Content） */
export function empty(status = 204, headers: HeadersInit = {}): Response {
  return new Response(null, {
    status,
    headers,
  });
}

/** 生成流式响应 */
export function stream(
  stream: ReadableStream,
  status = 200,
  headers: HeadersInit = {},
): Response {
  const h = new Headers({
    "Content-Type": "application/octet-stream",
    ...headers,
  });

  return new Response(stream, {
    status,
    headers: h,
  });
}

// ==================== 错误响应工具 ====================

/**
 * 创建错误响应
 *
 * @example
 * ```typescript
 * // 自定义错误
 * throw err('用户不存在', 404, 'NOT_FOUND')
 *
 * // 预定义错误
 * throw err.notFound('用户不存在')
 * throw err.badRequest('参数错误')
 * throw err.unauthorized('请先登录')
 * ```
 */
export function err(message: string, status = 500, type = "ERROR") {
  return new VafastError(message, { status, type, expose: true });
}

/** 400 Bad Request */
err.badRequest = (message = "请求参数错误") =>
  err(message, 400, "BAD_REQUEST");

/** 401 Unauthorized */
err.unauthorized = (message = "未授权") =>
  err(message, 401, "UNAUTHORIZED");

/** 403 Forbidden */
err.forbidden = (message = "禁止访问") =>
  err(message, 403, "FORBIDDEN");

/** 404 Not Found */
err.notFound = (message = "资源不存在") =>
  err(message, 404, "NOT_FOUND");

/** 409 Conflict */
err.conflict = (message = "资源冲突") =>
  err(message, 409, "CONFLICT");

/** 422 Unprocessable Entity */
err.unprocessable = (message = "无法处理的实体") =>
  err(message, 422, "UNPROCESSABLE_ENTITY");

/** 429 Too Many Requests */
err.tooMany = (message = "请求过于频繁") =>
  err(message, 429, "TOO_MANY_REQUESTS");

/** 500 Internal Server Error */
err.internal = (message = "服务器内部错误") =>
  err(message, 500, "INTERNAL_ERROR");
