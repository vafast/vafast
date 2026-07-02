import { defineRoute, defineRoutes } from "./src/defineRoute";
import { Server } from "./src/server";
import { Type } from "@sinclair/typebox/type";

const TestBodySchema = Type.Object({
  name: Type.String(),
  age: Type.Number(),
});

const routes = defineRoutes([
  defineRoute({
    method: "GET",
    path: "/",
    handler: () => "Hello world",
  }),
  defineRoute({
    method: "POST",
    path: "/echo",
    handler: async ({ req }) => await req.text(),
  }),
  defineRoute({
    method: "POST",
    path: "/test/body",
    schema: { body: TestBodySchema },
    handler: ({ req, body }) => ({
      success: true,
      message: "Body Schema验证通过",
      data: {
        receivedBody: body,
        userAgent: req.headers.get("user-agent"),
        timestamp: new Date().toISOString(),
      },
    }),
  }),
]);

const server = new Server(routes);

export default {
  fetch: (req: Request) => server.fetch(req),
};
