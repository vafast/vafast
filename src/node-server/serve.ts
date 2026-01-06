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

/** 优雅关闭配置 */
export interface GracefulShutdownOptions {
  /** 关闭超时时间（毫秒），默认 30000 */
  timeout?: number;
  /** 关闭前回调 */
  onShutdown?: () => void | Promise<void>;
  /** 关闭完成回调 */
  onShutdownComplete?: () => void;
  /** 监听的信号，默认 ['SIGINT', 'SIGTERM'] */
  signals?: NodeJS.Signals[];
}

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
  /** 优雅关闭配置，设置为 true 使用默认配置 */
  gracefulShutdown?: boolean | GracefulShutdownOptions;
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
  /** 优雅关闭（等待现有请求完成） */
  shutdown: () => Promise<void>;
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
  const { fetch, port = 3000, hostname = "0.0.0.0", onError, gracefulShutdown } = options;

  const defaultHost = `${hostname === "0.0.0.0" ? "localhost" : hostname}:${port}`;
  const handler = createRequestHandler(fetch, defaultHost, onError);

  const server = createServer(handler);

  // 追踪活跃连接
  const connections = new Set<import("node:net").Socket>();

  server.on("connection", (socket) => {
    connections.add(socket);
    socket.on("close", () => connections.delete(socket));
  });

  // 优雅关闭函数
  let isShuttingDown = false;

  const shutdown = async (): Promise<void> => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    const shutdownOptions: GracefulShutdownOptions =
      typeof gracefulShutdown === "object" ? gracefulShutdown : {};

    const timeout = shutdownOptions.timeout ?? 30000;

    // 执行关闭前回调
    if (shutdownOptions.onShutdown) {
      await shutdownOptions.onShutdown();
    }

    return new Promise<void>((resolve) => {
      // 设置超时强制关闭
      const forceCloseTimer = setTimeout(() => {
        // 强制关闭所有连接
        for (const socket of connections) {
          socket.destroy();
        }
        connections.clear();
        resolve();
      }, timeout);

      // 停止接受新连接
      server.close(() => {
        clearTimeout(forceCloseTimer);
        shutdownOptions.onShutdownComplete?.();
        resolve();
      });

      // 关闭空闲连接
      for (const socket of connections) {
        // 如果连接空闲，立即关闭
        if (!socket.writableLength) {
          socket.end();
        }
      }
    });
  };

  // 注册信号处理
  if (gracefulShutdown) {
    const shutdownOptions: GracefulShutdownOptions =
      typeof gracefulShutdown === "object" ? gracefulShutdown : {};

    const signals = shutdownOptions.signals ?? ["SIGINT", "SIGTERM"];

    for (const signal of signals) {
      process.on(signal, () => {
        shutdown().then(() => process.exit(0));
      });
    }
  }

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
    shutdown,
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
