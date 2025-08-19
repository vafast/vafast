import { Server } from "../../src";
import type { Route, Middleware } from "../../src";

// 基础日志中间件 - 符合 Vafast 文档风格
const logger: Middleware = async (req, next) => {
  const start = Date.now();
  const res = await next();
  console.log(`[${req.method}] ${req.url} - ${Date.now() - start}ms`);
  return res;
};

// 认证中间件
const requireAuth: Middleware = async (req, next) => {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");

  if (!token || token !== "valid-token") {
    return new Response("Unauthorized", {
      status: 401,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return next();
};

// 管理员权限中间件
const requireAdmin: Middleware = async (req, next) => {
  const role = req.headers.get("x-user-role");

  if (role !== "admin") {
    return new Response("Forbidden", {
      status: 403,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return next();
};

// 安全头中间件
const securityHeaders: Middleware = async (req, next) => {
  const res = await next();

  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-XSS-Protection", "1; mode=block");

  return res;
};

const routes: Route[] = [
  {
    method: "GET",
    path: "/",
    handler: () =>
      new Response("Public endpoint", {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      }),
    middleware: [logger, securityHeaders], // 全局中间件 + 安全头
  },
  {
    method: "GET",
    path: "/api/data",
    handler: () =>
      new Response(JSON.stringify({ message: "Protected data" }), {
        headers: { "Content-Type": "application/json; charset=utf-8" },
      }),
    middleware: [logger, requireAuth, securityHeaders], // 需要认证
  },
  {
    method: "GET",
    path: "/admin",
    handler: () =>
      new Response("Welcome, admin", {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      }),
    middleware: [logger, requireAuth, requireAdmin, securityHeaders], // 需要管理员权限
  },
];

const server = new Server(routes);

// 全局中间件 - 应用到所有路由
server.use(logger);
server.use(securityHeaders);

export default {
  fetch: (req: Request) => server.fetch(req),
};
