import { describe, it, expect, beforeEach } from "vitest";
import { Server } from "../../src";
import type { Route } from "../../src";

describe("基础示例", () => {
  describe("Hello World", () => {
    let server: Server;
    let routes: Route[];

    beforeEach(() => {
      routes = [
        {
          method: "GET",
          path: "/",
          handler: () =>
            new Response("来自 Vafast 的 Hello World！", {
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            }),
        },
      ];
      server = new Server(routes);
    });

    it("应该返回 hello world 消息", async () => {
      const request = new Request("http://localhost/", { method: "GET" });
      const response = await server.fetch(request);

      expect(response.status).toBe(200);
      expect(await response.text()).toBe("来自 Vafast 的 Hello World！");
      expect(response.headers.get("Content-Type")).toBe(
        "text/plain; charset=utf-8"
      );
    });
  });

  describe("REST API", () => {
    let server: Server;
    let routes: Route[];
    let users: Array<{ id: number; name: string; email: string }>;

    beforeEach(() => {
      users = [
        { id: 1, name: "Alice", email: "alice@example.com" },
        { id: 2, name: "Bob", email: "bob@example.com" },
      ];

      routes = [
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
                headers: { "Content-Type": "application/json" },
              }
            );
          },
        },
      ];
      server = new Server(routes);
    });

    it("应该获取所有用户", async () => {
      const request = new Request("http://localhost/users", { method: "GET" });
      const response = await server.fetch(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual(users);
    });

    it("应该根据 ID 获取用户", async () => {
      const request = new Request("http://localhost/users/1", {
        method: "GET",
      });
      const response = await server.fetch(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual(users[0]);
    });

    it("应该为不存在的用户返回 404", async () => {
      const request = new Request("http://localhost/users/999", {
        method: "GET",
      });
      const response = await server.fetch(request);

      expect(response.status).toBe(404);
      expect(await response.text()).toBe("用户未找到");
    });

    it("应该创建新用户", async () => {
      const newUser = { name: "Charlie", email: "charlie@example.com" };
      const request = new Request("http://localhost/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });

      const response = await server.fetch(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.message).toBe("用户创建成功");
      expect(data.user.name).toBe("Charlie");
      expect(data.user.id).toBe(3);
    });
  });
});
