/**
 * Node.js 服务器适配器
 * 提供类似 Bun.serve 的 API
 */

import {
  createServer,
  type Server as HttpServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { createProxyRequest } from "./request";
import { writeResponse } from "./response";

/** fetch 函数类型 */
export type FetchHandler = (request: Request) => Response | Promise<Response>;

/** serve 配置选项 */
export interface ServeOptions {
  /** fetch 处理函数 */
  fetch: FetchHandler;
  /** 端口号，默认 3000 */
  port?: number;
  /** 主机名，默认 0.0.0.0 */
  hostname?: string;
  /** 错误处理函数 */
  onError?: (error: Error) => Response | Promise<Response>;
}

/** serve 返回的服务器信息 */
export interface ServeResult {
  /** Node.js HTTP Server 实例 */
  server: HttpServer;
  /** 服务器端口 */
  port: number;
  /** 服务器主机名 */
  hostname: string;
  /** 关闭服务器 */
  stop: () => Promise<void>;
}

/**
 * 创建请求处理函数
 */
function createRequestHandler(
  fetch: FetchHandler,
  defaultHost: string,
  onError?: (error: Error) => Response | Promise<Response>,
) {
  return async (incoming: IncomingMessage, outgoing: ServerResponse) => {
    try {
      // 创建代理 Request（延迟创建真实 Request）
      const request = createProxyRequest(incoming, defaultHost);

      // 调用 fetch handler
      const response = await fetch(request);

      // 流式写入 Response
      await writeResponse(response, outgoing);
    } catch (error) {
      // 错误处理
      const err = error instanceof Error ? error : new Error(String(error));

      if (onError) {
        try {
          const errorResponse = await onError(err);
          await writeResponse(errorResponse, outgoing);
          return;
        } catch {
          // onError 也失败了，返回 500
        }
      }

      // 默认错误响应
      if (!outgoing.headersSent) {
        outgoing.statusCode = 500;
        outgoing.setHeader("Content-Type", "text/plain");
        outgoing.end("Internal Server Error");
      }
    }
  };
}

/**
 * 启动 HTTP 服务器
 *
 * @example
 * ```ts
 * import { serve } from "@vafast/node-server";
 * import { Server } from "vafast";
 *
 * const app = new Server([
 *   { method: "GET", path: "/", handler: () => "Hello World" },
 * ]);
 *
 * serve({ fetch: app.fetch, port: 3000 }, () => {
 *   console.log("Server running on http://localhost:3000");
 * });
 * ```
 */
export function serve(
  options: ServeOptions,
  callback?: () => void,
): ServeResult {
  const { fetch, port = 3000, hostname = "0.0.0.0", onError } = options;

  const defaultHost = `${hostname === "0.0.0.0" ? "localhost" : hostname}:${port}`;
  const handler = createRequestHandler(fetch, defaultHost, onError);

  const server = createServer(handler);

  // 启动服务器
  server.listen(port, hostname, callback);

  return {
    server,
    port,
    hostname,
    stop: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      }),
  };
}

/**
 * 创建适配器服务器（不自动启动）
 * 用于需要更多控制的场景
 */
export function createAdaptorServer(
  fetch: FetchHandler,
  onError?: (error: Error) => Response | Promise<Response>,
): HttpServer {
  const handler = createRequestHandler(fetch, "localhost", onError);
  return createServer(handler);
}
