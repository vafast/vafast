/**
 * 优化的 Response 写入
 * 流式写入，避免内存拷贝
 */

import type { ServerResponse } from "node:http";

/**
 * 构建 Node.js 响应头
 * 处理 set-cookie 多值情况
 */
function buildOutgoingHeaders(headers: Headers): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};
  const cookies: string[] = [];

  headers.forEach((value, key) => {
    if (key === "set-cookie") {
      cookies.push(value);
    } else {
      result[key] = value;
    }
  });

  if (cookies.length > 0) {
    result["set-cookie"] = cookies;
  }

  return result;
}

/**
 * 流式写入 Response body 到 ServerResponse
 * 支持背压处理，避免内存溢出
 */
async function writeBodyStream(
  body: ReadableStream<Uint8Array>,
  outgoing: ServerResponse
): Promise<void> {
  const reader = body.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      // 背压处理：如果写入返回 false，等待 drain 事件
      const canContinue = outgoing.write(value);
      if (!canContinue) {
        await new Promise<void>((resolve) => {
          outgoing.once("drain", resolve);
        });
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * 将 Web Response 写入 Node.js ServerResponse
 * 流式写入，零拷贝
 */
export async function writeResponse(
  response: Response,
  outgoing: ServerResponse
): Promise<void> {
  // 设置状态码
  outgoing.statusCode = response.status;

  // 设置响应头
  const headers = buildOutgoingHeaders(response.headers);
  for (const [key, value] of Object.entries(headers)) {
    outgoing.setHeader(key, value);
  }

  const body = response.body;

  // 无 body 的情况
  if (!body) {
    outgoing.end();
    return;
  }

  // 流式写入 body
  try {
    await writeBodyStream(body, outgoing);
    outgoing.end();
  } catch (error) {
    // 处理客户端提前断开等情况
    if (!outgoing.destroyed) {
      outgoing.destroy(error instanceof Error ? error : new Error(String(error)));
    }
  }
}

/**
 * 简化版写入（用于已知小体积响应）
 * 直接 arrayBuffer 转换，适用于确定的小响应
 */
export async function writeResponseSimple(
  response: Response,
  outgoing: ServerResponse
): Promise<void> {
  outgoing.statusCode = response.status;

  const headers = buildOutgoingHeaders(response.headers);
  for (const [key, value] of Object.entries(headers)) {
    outgoing.setHeader(key, value);
  }

  const body = response.body;
  if (!body) {
    outgoing.end();
    return;
  }

  // 对于小响应，直接读取全部内容
  const buffer = await response.arrayBuffer();
  outgoing.end(Buffer.from(buffer));
}

