/**
 * Server 单元测试
 */

import { describe, it, expect } from "vitest";
import { Server } from "../../../src/server";
import { defineRoutes, defineRoute } from "../../../src/defineRoute";

describe("Server", () => {
  describe("基本路由", () => {
    it("应该处理根路径", async () => {
      const routes = defineRoutes([
        defineRoute({
          method: "GET",
          path: "/",
          handler: () => "Hello World",
        }),
      ]);
      const server = new Server(routes);

      const req = new Request("http://localhost/");
      const res = await server.fetch(req);

      expect(res.status).toBe(200);
      expect(await res.text()).toBe("Hello World");
    });

    it("应该处理静态路径", async () => {
      const routes = defineRoutes([
        defineRoute({
          method: "GET",
          path: "/users",
          handler: () => [{ id: 1 }],
        }),
      ]);
      const server = new Server(routes);

      const req = new Request("http://localhost/users");
      const res = await server.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toEqual([{ id: 1 }]);
    });

    it("应该处理动态路径参数", async () => {
      const routes = defineRoutes([
        defineRoute({
          method: "GET",
          path: "/users/:id",
          handler: ({ params }) => ({ userId: params.id }),
        }),
      ]);
      const server = new Server(routes);

      const req = new Request("http://localhost/users/123");
      const res = await server.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.userId).toBe("123");
    });

    it("应该处理多个动态参数", async () => {
      const routes = defineRoutes([
        defineRoute({
          method: "GET",
          path: "/posts/:postId/comments/:commentId",
          handler: ({ params }) => ({
            postId: params.postId,
            commentId: params.commentId,
          }),
        }),
      ]);
      const server = new Server(routes);

      const req = new Request("http://localhost/posts/10/comments/5");
      const res = await server.fetch(req);
      const data = await res.json();

      expect(data.postId).toBe("10");
      expect(data.commentId).toBe("5");
    });

    it("应该处理通配符路径", async () => {
      const routes = defineRoutes([
        defineRoute({
          method: "GET",
          path: "/files/*",
          handler: ({ params }) => ({ path: params["*"] }),
        }),
      ]);
      const server = new Server(routes);

      const req = new Request("http://localhost/files/path/to/file.txt");
      const res = await server.fetch(req);
      const data = await res.json();

      expect(data.path).toBe("path/to/file.txt");
    });
  });

  describe("HTTP 方法", () => {
    it("应该区分不同的 HTTP 方法", async () => {
      const routes = defineRoutes([
        defineRoute({
          method: "GET",
          path: "/users",
          handler: () => "GET users",
        }),
        defineRoute({
          method: "POST",
          path: "/users",
          handler: () => ({ message: "POST users" }),
        }),
      ]);
      const server = new Server(routes);

      const getReq = new Request("http://localhost/users", { method: "GET" });
      const getRes = await server.fetch(getReq);
      expect(await getRes.text()).toBe("GET users");

      const postReq = new Request("http://localhost/users", { method: "POST" });
      const postRes = await server.fetch(postReq);
      const postData = await postRes.json();
      expect(postData.message).toBe("POST users");
    });

    it("应该返回 405 对于不支持的方法", async () => {
      const routes = defineRoutes([
        defineRoute({
          method: "GET",
          path: "/users",
          handler: () => "GET users",
        }),
      ]);
      const server = new Server(routes);

      const req = new Request("http://localhost/users", { method: "DELETE" });
      const res = await server.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(405);
      expect(data.code).toBe(405);
      expect(data.message).toContain("not allowed");
      expect(data.allowedMethods).toContain("GET");
      expect(res.headers.get("Allow")).toBe("GET");
    });

    it("应该返回 404 对于不存在的路径", async () => {
      const routes = defineRoutes([
        defineRoute({
          method: "GET",
          path: "/users",
          handler: () => "users",
        }),
      ]);
      const server = new Server(routes);

      const req = new Request("http://localhost/posts");
      const res = await server.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.code).toBe(404);
      expect(data.message).toBe("Not Found");
    });
  });

  describe("嵌套路由", () => {
    it("应该处理嵌套路由", async () => {
      const routes = defineRoutes([
        defineRoute({
          path: "/api",
          children: [
            defineRoute({
              path: "/v1",
              children: [
                defineRoute({
                  method: "GET",
                  path: "/users",
                  handler: () => "API v1 users",
                }),
              ],
            }),
          ],
        }),
      ]);

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

      const routes = defineRoutes([
        defineRoute({
          method: "GET",
          path: "/test",
          handler: () => "test",
        }),
      ]);
      const server = new Server(routes);

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
        next: () => Promise<Response>,
      ) => {
        logs.push("route middleware");
        return next();
      };

      const routes = defineRoutes([
        defineRoute({
          method: "GET",
          path: "/test",
          handler: () => "test",
          middleware: [middleware],
        }),
      ]);
      const server = new Server(routes);

      const req = new Request("http://localhost/test");
      await server.fetch(req);

      expect(logs).toContain("route middleware");
    });
  });

  describe("动态添加路由", () => {
    it("应该支持动态添加路由", async () => {
      const server = new Server([]);

      const routes = defineRoutes([
        defineRoute({
          method: "GET",
          path: "/dynamic",
          handler: () => "dynamic route",
        }),
      ]);
      server.addRoutes(routes);

      const req = new Request("http://localhost/dynamic");
      const res = await server.fetch(req);

      expect(res.status).toBe(200);
      expect(await res.text()).toBe("dynamic route");
    });
  });

  describe("路由优先级", () => {
    it("静态路由应该优先于动态路由", async () => {
      const routes = defineRoutes([
        defineRoute({
          method: "GET",
          path: "/users/admin",
          handler: () => "admin user",
        }),
        defineRoute({
          method: "GET",
          path: "/users/:id",
          handler: () => "user by id",
        }),
      ]);
      const server = new Server(routes);

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
      const routes = defineRoutes([
        defineRoute({ method: "GET", path: "/users", handler: () => "" }),
        defineRoute({ method: "POST", path: "/users", handler: () => "" }),
        defineRoute({ method: "GET", path: "/users/:id", handler: () => "" }),
      ]);
      const server = new Server(routes);

      const registeredRoutes = server.getRoutes();

      expect(registeredRoutes.length).toBe(3);
    });
  });
});
