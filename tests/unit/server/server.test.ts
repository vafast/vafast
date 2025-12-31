/**
 * Server 单元测试
 */

import { describe, it, expect } from "vitest";
import { Server } from "../../../src/server";
import type { NestedRoute } from "../../../src/types";

describe("Server", () => {
  describe("基本路由", () => {
    it("应该处理根路径", async () => {
      const server = new Server([
        {
          method: "GET",
          path: "/",
          handler: () => new Response("Hello World"),
        },
      ]);

      const req = new Request("http://localhost/");
      const res = await server.fetch(req);

      expect(res.status).toBe(200);
      expect(await res.text()).toBe("Hello World");
    });

    it("应该处理静态路径", async () => {
      const server = new Server([
        {
          method: "GET",
          path: "/users",
          handler: () =>
            new Response(JSON.stringify([{ id: 1 }]), {
              headers: { "Content-Type": "application/json" },
            }),
        },
      ]);

      const req = new Request("http://localhost/users");
      const res = await server.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toEqual([{ id: 1 }]);
    });

    it("应该处理动态路径参数", async () => {
      const server = new Server([
        {
          method: "GET",
          path: "/users/:id",
          handler: (req) => {
            const params = (req as unknown as { params: Record<string, string> })
              .params;
            return new Response(JSON.stringify({ userId: params.id }), {
              headers: { "Content-Type": "application/json" },
            });
          },
        },
      ]);

      const req = new Request("http://localhost/users/123");
      const res = await server.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.userId).toBe("123");
    });

    it("应该处理多个动态参数", async () => {
      const server = new Server([
        {
          method: "GET",
          path: "/posts/:postId/comments/:commentId",
          handler: (req) => {
            const params = (req as unknown as { params: Record<string, string> })
              .params;
            return new Response(
              JSON.stringify({
                postId: params.postId,
                commentId: params.commentId,
              }),
              { headers: { "Content-Type": "application/json" } }
            );
          },
        },
      ]);

      const req = new Request("http://localhost/posts/10/comments/5");
      const res = await server.fetch(req);
      const data = await res.json();

      expect(data.postId).toBe("10");
      expect(data.commentId).toBe("5");
    });

    it("应该处理通配符路径", async () => {
      const server = new Server([
        {
          method: "GET",
          path: "/files/*",
          handler: (req) => {
            const params = (req as unknown as { params: Record<string, string> })
              .params;
            return new Response(JSON.stringify({ path: params["*"] }), {
              headers: { "Content-Type": "application/json" },
            });
          },
        },
      ]);

      const req = new Request("http://localhost/files/path/to/file.txt");
      const res = await server.fetch(req);
      const data = await res.json();

      expect(data.path).toBe("path/to/file.txt");
    });
  });

  describe("HTTP 方法", () => {
    it("应该区分不同的 HTTP 方法", async () => {
      const server = new Server([
        {
          method: "GET",
          path: "/users",
          handler: () => new Response("GET users"),
        },
        {
          method: "POST",
          path: "/users",
          handler: () => new Response("POST users", { status: 201 }),
        },
      ]);

      const getReq = new Request("http://localhost/users", { method: "GET" });
      const getRes = await server.fetch(getReq);
      expect(await getRes.text()).toBe("GET users");

      const postReq = new Request("http://localhost/users", { method: "POST" });
      const postRes = await server.fetch(postReq);
      expect(await postRes.text()).toBe("POST users");
      expect(postRes.status).toBe(201);
    });

    it("应该返回 405 对于不支持的方法", async () => {
      const server = new Server([
        {
          method: "GET",
          path: "/users",
          handler: () => new Response("GET users"),
        },
      ]);

      const req = new Request("http://localhost/users", { method: "DELETE" });
      const res = await server.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(405);
      expect(data.error).toBe("Method Not Allowed");
      expect(data.allowedMethods).toContain("GET");
      expect(res.headers.get("Allow")).toBe("GET");
    });

    it("应该返回 404 对于不存在的路径", async () => {
      const server = new Server([
        {
          method: "GET",
          path: "/users",
          handler: () => new Response("users"),
        },
      ]);

      const req = new Request("http://localhost/posts");
      const res = await server.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe("Not Found");
    });
  });

  describe("嵌套路由", () => {
    it("应该处理嵌套路由", async () => {
      const routes: NestedRoute[] = [
        {
          path: "/api",
          children: [
            {
              path: "/v1",
              children: [
                {
                  method: "GET",
                  path: "/users",
                  handler: () => new Response("API v1 users"),
                },
              ],
            },
          ],
        },
      ];

      const server = new Server(routes);

      const req = new Request("http://localhost/api/v1/users");
      const res = await server.fetch(req);

      expect(res.status).toBe(200);
      expect(await res.text()).toBe("API v1 users");
    });
  });

  describe("中间件", () => {
    it("应该执行全局中间件", async () => {
      const logs: string[] = [];

      const server = new Server([
        {
          method: "GET",
          path: "/test",
          handler: () => new Response("test"),
        },
      ]);

      server.use(async (req, next) => {
        logs.push("before");
        const res = await next();
        logs.push("after");
        return res;
      });

      const req = new Request("http://localhost/test");
      await server.fetch(req);

      expect(logs).toEqual(["before", "after"]);
    });

    it("应该执行路由级中间件", async () => {
      const logs: string[] = [];

      const middleware = async (
        req: Request,
        next: () => Promise<Response>
      ) => {
        logs.push("route middleware");
        return next();
      };

      const server = new Server([
        {
          method: "GET",
          path: "/test",
          handler: () => new Response("test"),
          middleware: [middleware],
        },
      ]);

      const req = new Request("http://localhost/test");
      await server.fetch(req);

      expect(logs).toContain("route middleware");
    });
  });

  describe("动态添加路由", () => {
    it("应该支持动态添加路由", async () => {
      const server = new Server([]);

      server.addRoute({
        method: "GET",
        path: "/dynamic",
        handler: () => new Response("dynamic route"),
      });

      const req = new Request("http://localhost/dynamic");
      const res = await server.fetch(req);

      expect(res.status).toBe(200);
      expect(await res.text()).toBe("dynamic route");
    });
  });

  describe("路由优先级", () => {
    it("静态路由应该优先于动态路由", async () => {
      const server = new Server([
        {
          method: "GET",
          path: "/users/admin",
          handler: () => new Response("admin user"),
        },
        {
          method: "GET",
          path: "/users/:id",
          handler: () => new Response("user by id"),
        },
      ]);

      // 静态路径优先
      const adminReq = new Request("http://localhost/users/admin");
      const adminRes = await server.fetch(adminReq);
      expect(await adminRes.text()).toBe("admin user");

      // 动态路径匹配其他
      const userReq = new Request("http://localhost/users/123");
      const userRes = await server.fetch(userReq);
      expect(await userRes.text()).toBe("user by id");
    });
  });

  describe("getRoutes", () => {
    it("应该返回所有注册的路由", async () => {
      const server = new Server([
        { method: "GET", path: "/users", handler: () => new Response("") },
        { method: "POST", path: "/users", handler: () => new Response("") },
        {
          method: "GET",
          path: "/users/:id",
          handler: () => new Response(""),
        },
      ]);

      const routes = server.getRoutes();

      expect(routes.length).toBe(3);
    });
  });

});

