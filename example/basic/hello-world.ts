import { Server } from "../../src";
import type { Route } from "../../src";

// 最简单的 Hello World 示例
const routes: Route[] = [
  {
    method: "GET",
    path: "/",
    handler: () =>
      new Response("来自 Vafast 的 Hello World！", {
        headers: { "Content-Type": "text/plain" },
      }),
  },
];

const server = new Server(routes);

export default {
  fetch: (req: Request) => server.fetch(req),
};
