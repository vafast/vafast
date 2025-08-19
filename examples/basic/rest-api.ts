import { Server } from "../../src";
import type { Route } from "../../src";

// REST API 示例
const users = [
  { id: 1, name: "Alice", email: "alice@example.com" },
  { id: 2, name: "Bob", email: "bob@example.com" },
];

const routes: Route[] = [
  {
    method: "GET",
    path: "/users",
    handler: () =>
      new Response(JSON.stringify(users), {
        headers: { "Content-Type": "application/json" },
      }),
  },
  {
    method: "GET",
    path: "/users/:id",
    handler: (req, params) => {
      const id = parseInt(params?.id || "0");
      const user = users.find((u) => u.id === id);

      if (!user) {
        return new Response("用户未找到", {
          status: 404,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }

      return new Response(JSON.stringify(user), {
        headers: { "Content-Type": "application/json" },
      });
    },
  },
  {
    method: "POST",
    path: "/users",
    handler: async (req) => {
      const body = await req.json();
      const newUser = { id: users.length + 1, ...body };
      users.push(newUser);

      return new Response(
        JSON.stringify({
          message: "用户创建成功",
          user: newUser,
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/json; charset=utf-8" },
        }
      );
    },
  },
];

const server = new Server(routes);

export default {
  fetch: (req: Request) => server.fetch(req),
};
