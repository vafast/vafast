import { defineRoutes } from "./src/defineRoute";
import type { Route } from "./src/types"; // 型補完にも使える
import { Server } from "./src/server";
import { createRouteHandler } from "./src/utils/route-handler-factory";
import { Type } from "@sinclair/typebox/type";
const TestBodySchema = Type.Object({
  name: Type.String(),
  age: Type.Number(),
});
const routes = defineRoutes([
  {
    method: "GET",
    path: "/",
    handler: createRouteHandler(() => "Hello world"),
  },
  {
    method: "POST",
    path: "/echo",
    handler: createRouteHandler(async ({ req }) => await req.text()),
  },
  {
    method: "POST",
    path: "/test/body",
    handler: createRouteHandler(
      ({ req, body }) => {
        // 现在可以直接使用 req，也可以解构需要的参数
        const userAgent = req.headers.get("user-agent");

        return {
          success: true,
          message: "Body Schema验证通过",
          data: {
            receivedBody: body,
            userAgent,
            timestamp: new Date().toISOString(),
          },
        };
      },
      {
        body: TestBodySchema,
      }
    ),
  },
] as const satisfies Route[]);

const server = new Server(routes);

// 导出 fetch 函数，使 Bun 能够启动 HTTP 服务器
export default {
  fetch: (req: Request) => server.fetch(req),
};
