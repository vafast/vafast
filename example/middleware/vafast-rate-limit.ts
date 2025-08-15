import { Server } from "../../src";
import type { Route, Middleware } from "../../src";

// 简单的内存存储
const requestCounts = new Map<string, { count: number; resetTime: number }>();

// 速率限制中间件 - 符合 Vafast 文档风格
const rateLimit = (options: { windowMs: number; max: number }): Middleware => {
  const { windowMs, max } = options;
  
  return async (req, next) => {
    const clientId = req.headers.get("X-Forwarded-For") || 
                    req.headers.get("X-Real-IP") || 
                    "unknown";
    
    const now = Date.now();
    const clientData = requestCounts.get(clientId);
    
    if (!clientData || now > clientData.resetTime) {
      // 重置计数器
      requestCounts.set(clientId, { count: 1, resetTime: now + windowMs });
    } else if (clientData.count >= max) {
      // 超过限制
      return new Response(JSON.stringify({
        error: "rate_limit",
        message: "请求过于频繁"
      }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": Math.ceil(windowMs / 1000).toString(),
        }
      });
    } else {
      // 增加计数器
      clientData.count++;
    }
    
    const response = await next();
    
    // 添加速率限制头
    const remaining = Math.max(0, max - (clientData?.count || 0));
    response.headers.set("X-RateLimit-Limit", max.toString());
    response.headers.set("X-RateLimit-Remaining", remaining.toString());
    response.headers.set("X-RateLimit-Reset", new Date(clientData?.resetTime || 0).toISOString());
    
    return response;
  };
};

// 创建速率限制器
const limiter = rateLimit({
  windowMs: 60_000, // 1分钟窗口
  max: 5,           // 限制每个客户端在窗口内最多5次请求
});

const routes: Route[] = [
  {
    method: "GET",
    path: "/limited",
    handler: () => new Response(JSON.stringify({ 
      message: "您在速率限制范围内！" 
    }), {
      headers: { "Content-Type": "application/json" }
    }),
    middleware: [limiter],
  },
  {
    method: "GET",
    path: "/api/data",
    handler: () => new Response(JSON.stringify({ 
      message: "受保护的数据" 
    }), {
      headers: { "Content-Type": "application/json" }
    }),
    middleware: [limiter],
  },
];

const server = new Server(routes);

export default {
  fetch: (req: Request) => server.fetch(req),
};
