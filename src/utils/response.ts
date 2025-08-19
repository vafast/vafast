// src/response.ts

/** 生成 JSON 响应 */
export function json(
  data: unknown,
  status = 200,
  headers: HeadersInit = {}
): Response {
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

/** 生成纯文本响应 */
export function text(
  content: string,
  status = 200,
  headers: HeadersInit = {}
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
  headers: HeadersInit = {}
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
  headers: HeadersInit = {}
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
