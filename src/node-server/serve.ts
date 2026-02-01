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

/**
 * 请求超时配置
 *
 * 默认行为与 Fastify 和 Node.js 一致：
 * - requestTimeout: 0（无限制，需显式设置以防 DoS 攻击）
 * - headersTimeout: 使用 Node.js 默认值 60000ms
 * - keepAliveTimeout: 使用 Node.js 默认值 5000ms
 *
 * @see https://fastify.dev/docs/latest/Reference/Server/#requesttimeout
 */
export interface RequestTimeoutOptions {
  /**
   * 单个请求的最大处理时间（毫秒）
   * - 默认: 0（无限制）
   * - 建议: 如果没有反向代理，设置为 30000-120000 以防 DoS
   */
  requestTimeout?: number;
  /**
   * 接收完整请求头的超时时间（毫秒）
   * - 不设置则使用 Node.js 默认值（60000ms）
   */
  headersTimeout?: number;
  /**
   * Keep-Alive 连接空闲超时时间（毫秒）
   * - 不设置则使用 Node.js 默认值（5000ms）
   */
  keepAliveTimeout?: number;
  /**
   * 超时时返回的 JSON 响应
   * - 默认: { code: 504, message: "Request timeout" }
   */
  timeoutResponse?: { code: number; message: string };
}

/**
 * 信任代理配置
 * - true: 信任所有代理，从 X-Forwarded-For 等头获取真实 IP
 * - false: 不信任代理，使用 socket IP（默认）
 * - string: 信任特定 IP 或 CIDR（如 "127.0.0.1" 或 "10.0.0.0/8"）
 * - string[]: 信任多个 IP 或 CIDR
 */
export type TrustProxyOption = boolean | string | string[];

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
  /** 请求超时配置 */
  timeout?: RequestTimeoutOptions;
  /**
   * 请求体大小限制（字节）
   * - 默认: 1048576 (1MB)
   * - 设置为 0 表示不限制
   * - 超过限制返回 413 Payload Too Large
   */
  bodyLimit?: number;
  /**
   * 信任代理配置
   * - true: 信任所有代理，从 X-Forwarded-For 等头获取真实 IP
   * - false: 不信任代理，使用 socket IP（默认）
   * - string/string[]: 信任特定 IP 或 CIDR
   * 
   * 启用后，request 对象会附加 ip 和 ips 属性
   */
  trustProxy?: TrustProxyOption;
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

/** 默认请求体大小限制：1MB */
const DEFAULT_BODY_LIMIT = 1048576;

/**
 * 创建请求处理函数
 */
function createRequestHandler(
  fetch: FetchHandler,
  defaultHost: string,
  onError?: (error: Error) => Response | Promise<Response>,
  timeoutOptions?: RequestTimeoutOptions,
  bodyLimit?: number,
  trustProxy?: TrustProxyOption,
) {
  const requestTimeout = timeoutOptions?.requestTimeout ?? 0;
  const timeoutResponse = timeoutOptions?.timeoutResponse ?? {
    code: 504,
    message: "Request timeout",
  };
  // bodyLimit: undefined 使用默认值，0 表示不限制
  const maxBodySize = bodyLimit === undefined ? DEFAULT_BODY_LIMIT : bodyLimit;

  return async (incoming: IncomingMessage, outgoing: ServerResponse) => {
    // 检查请求体大小限制
    if (maxBodySize > 0) {
      const contentLength = incoming.headers["content-length"];
      if (contentLength && parseInt(contentLength, 10) > maxBodySize) {
        outgoing.statusCode = 413;
        outgoing.setHeader("Content-Type", "application/json");
        outgoing.end(JSON.stringify({
          code: 413,
          message: "Payload Too Large",
          limit: maxBodySize,
        }));
        return;
      }
    }

    // 请求级别超时处理
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let isTimedOut = false;

    if (requestTimeout > 0) {
      timeoutId = setTimeout(() => {
        isTimedOut = true;
        if (!outgoing.headersSent) {
          outgoing.statusCode = 504;
          outgoing.setHeader("Content-Type", "application/json");
          outgoing.end(JSON.stringify(timeoutResponse));
        }
      }, requestTimeout);
    }

    try {
      // 创建代理 Request（延迟创建真实 Request）
      const request = createProxyRequest(incoming, defaultHost, { trustProxy });

      // 调用 fetch handler
      const response = await fetch(request);

      // 清除超时定时器
      if (timeoutId) clearTimeout(timeoutId);

      // 如果已超时，不再写入响应
      if (isTimedOut) return;

      // 流式写入 Response
      await writeResponse(response, outgoing);
    } catch (error) {
      // 清除超时定时器
      if (timeoutId) clearTimeout(timeoutId);

      // 如果已超时，不再处理错误
      if (isTimedOut) return;

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
  const { fetch, port = 3000, hostname = "0.0.0.0", onError, gracefulShutdown, timeout, bodyLimit, trustProxy } = options;

  const defaultHost = `${hostname === "0.0.0.0" ? "localhost" : hostname}:${port}`;
  const handler = createRequestHandler(fetch, defaultHost, onError, timeout, bodyLimit, trustProxy);

  const server = createServer(handler);

  // 设置服务器级别超时（Node.js 原生能力）
  if (timeout) {
    // headersTimeout: 接收完整请求头的超时时间
    if (timeout.headersTimeout !== undefined) {
      server.headersTimeout = timeout.headersTimeout;
    }
    // keepAliveTimeout: Keep-Alive 连接空闲超时时间
    if (timeout.keepAliveTimeout !== undefined) {
      server.keepAliveTimeout = timeout.keepAliveTimeout;
    }
  }

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
  timeout?: RequestTimeoutOptions,
  bodyLimit?: number,
  trustProxy?: TrustProxyOption,
): HttpServer {
  const handler = createRequestHandler(fetch, "localhost", onError, timeout, bodyLimit, trustProxy);
  return createServer(handler);
}
