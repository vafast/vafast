/**
 * 测试用中间件
 * 
 * 使用 defineMiddleware 创建类型安全的中间件
 */

import { defineMiddleware } from "../../src/defineRoute";

/**
 * 日志中间件 - 记录请求和响应
 */
export function createLoggerMiddleware(logs: string[]) {
  return defineMiddleware(async (req, next) => {
    const start = Date.now();
    logs.push(`[${req.method}] ${new URL(req.url).pathname} - start`);

    const response = await next();

    const duration = Date.now() - start;
    logs.push(
      `[${req.method}] ${new URL(req.url).pathname} - ${response.status} (${duration}ms)`,
    );

    return response;
  });
}

/**
 * 认证中间件 - 检查 Authorization 头
 */
export function createAuthMiddleware(validTokens: string[] = ["valid-token"]) {
  return defineMiddleware(async (req, next) => {
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", message: "Missing token" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const token = authHeader.replace("Bearer ", "");
    if (!validTokens.includes(token)) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", message: "Invalid token" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // 注入用户信息到上下文
    return next({ user: { id: "1", token } });
  });
}

/**
 * CORS 中间件
 */
export function createCorsMiddleware(allowedOrigins: string[] = ["*"]) {
  return defineMiddleware(async (req, next) => {
    const origin = req.headers.get("Origin") || "";
    const isAllowed =
      allowedOrigins.includes("*") || allowedOrigins.includes(origin);

    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": isAllowed ? origin || "*" : "",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    const response = await next();

    if (isAllowed) {
      response.headers.set("Access-Control-Allow-Origin", origin || "*");
    }

    return response;
  });
}

/**
 * 速率限制中间件
 */
export function createRateLimitMiddleware(options: {
  max: number;
  windowMs: number;
}) {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return defineMiddleware(async (req, next) => {
    const ip = req.headers.get("X-Forwarded-For") || "unknown";
    const now = Date.now();

    let record = requests.get(ip);
    if (!record || now > record.resetTime) {
      record = { count: 0, resetTime: now + options.windowMs };
      requests.set(ip, record);
    }

    record.count++;

    if (record.count > options.max) {
      return new Response(JSON.stringify({ error: "Too Many Requests" }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(Math.ceil((record.resetTime - now) / 1000)),
        },
      });
    }

    return next();
  });
}

/**
 * 错误处理中间件
 */
export function createErrorHandlerMiddleware(
  onError?: (error: Error) => void,
) {
  return defineMiddleware(async (req, next) => {
    try {
      return await next();
    } catch (error) {
      if (error instanceof Error) {
        onError?.(error);
        return new Response(
          JSON.stringify({
            error: "Internal Server Error",
            message: error.message,
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
      throw error;
    }
  });
}

/**
 * 请求时间中间件 - 添加 X-Response-Time 头
 */
export function createTimingMiddleware() {
  return defineMiddleware(async (req, next) => {
    const start = Date.now();
    const response = await next();
    const duration = Date.now() - start;
    response.headers.set("X-Response-Time", `${duration}ms`);
    return response;
  });
}

/**
 * 本地数据注入中间件
 */
export function createLocalsMiddleware(data: Record<string, unknown>) {
  return defineMiddleware(async (req, next) => {
    return next(data);
  });
}
