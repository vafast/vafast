import { defineRoutes } from "./src/defineRoute";
import type { Route } from "./src/types";
import { Server } from "./src/server";
import { createHandler } from "./src/utils/create-handler";
import { Type } from "@sinclair/typebox/type";

const TestBodySchema = Type.Object({
  name: Type.String(),
  age: Type.Number(),
});

const routes = defineRoutes([
  {
    method: "GET",
    path: "/",
    handler: createHandler({})(() => "Hello world"),
  },
  {
    method: "POST",
    path: "/echo",
    handler: createHandler({})(async ({ req }) => await req.text()),
  },
  {
    method: "POST",
    path: "/test/body",
    handler: createHandler({
      body: TestBodySchema,
    })(({ req, body }) => {
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
    }),
  },
] as const satisfies Route[]);

const server = new Server(routes);

// 导出 fetch 函数，使 Bun 能够启动 HTTP 服务器
export default {
  fetch: (req: Request) => server.fetch(req),
};
