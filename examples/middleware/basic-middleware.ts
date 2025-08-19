import { Server } from "../../src";
import type { Route, Middleware } from "../../src";

// 日志中间件
const logger: Middleware = async (req, next) => {
  const start = Date.now();
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

  const response = await next();

  const duration = Date.now() - start;
  console.log(
    `[${new Date().toISOString()}] ${req.method} ${req.url} - ${response.status} (${duration}ms)`
  );

  return response;
};

// 请求计时中间件
const timer: Middleware = async (req, next) => {
  const start = performance.now();
  const response = await next();
  const duration = performance.now() - start;

  response.headers.set("X-Response-Time", `${duration.toFixed(2)}ms`);
  return response;
};

// 请求 ID 中间件
const requestId: Middleware = async (req, next) => {
  const id = crypto.randomUUID();
  req.headers.set("X-Request-ID", id);

  const response = await next();
  response.headers.set("X-Request-ID", id);

  return response;
};

const routes: Route[] = [
  {
    method: "GET",
    path: "/",
    handler: () =>
      new Response("Hello with middleware!", {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      }),
    middleware: [logger, timer, requestId],
  },
  {
    method: "GET",
    path: "/api/data",
    handler: () =>
      new Response(JSON.stringify({ message: "Protected data" }), {
        headers: { "Content-Type": "application/json; charset=utf-8" },
      }),
    middleware: [logger, requestId],
  },
];

const server = new Server(routes);

export default {
  fetch: (req: Request) => server.fetch(req),
};
