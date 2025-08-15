import { defineRoutes } from "./src/defineRoute";
import type { Route } from "./src/types"; // 型補完にも使える
import { Server } from "./src/server";
const routes = defineRoutes([
  {
    method: "GET",
    path: "/",
    handler: (_req) => new Response("Hello world"),
  },
  {
    method: "POST",
    path: "/echo",
    handler: async (req) => new Response(await req.text()),
  },
] as const satisfies Route[]);
const server = new Server(routes);

// 导出 fetch 函数，使 Bun 能够启动 HTTP 服务器
export default {
  fetch: (req: Request) => server.fetch(req),
};
