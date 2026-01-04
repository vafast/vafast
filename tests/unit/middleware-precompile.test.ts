// tests/unit/middleware-precompile.test.ts
/**
 * 中间件预编译优化测试
 *
 * 测试中间件链在路由注册时预编译的功能
 */

import { describe, it, expect } from "vitest";
import { Server, defineRoutes, createHandler } from "../../src";
import type { Middleware } from "../../src/types";

describe("中间件预编译优化测试", () => {
  describe("基础功能测试", () => {
    it("无中间件路由应该自动预编译", async () => {
      const routes = defineRoutes([
        {
          method: "GET",
          path: "/",
          handler: createHandler(() => ({ message: "Hello" })),
        },
        {
          method: "GET",
          path: "/users/:id",
          handler: createHandler(({ params }) => ({ id: params.id })),
        },
      ]);

      const server = new Server(routes);

      // 测试基础路由
      const res1 = await server.fetch(new Request("http://localhost/"));
      expect(res1.status).toBe(200);
      const data1 = await res1.json();
      expect(data1).toEqual({ message: "Hello" });

      // 测试带参数路由
      const res2 = await server.fetch(
        new Request("http://localhost/users/123"),
      );
      expect(res2.status).toBe(200);
      const data2 = await res2.json();
      expect(data2).toEqual({ id: "123" });
    });

    it("带路由中间件的路由应该正常工作", async () => {
      const testMiddleware: Middleware = async (req, next) => {
        (req as unknown as Record<string, unknown>).__test = "middleware-ok";
        return next(req);
      };

      const routes = defineRoutes([
        {
          method: "GET",
          path: "/protected",
          middleware: [testMiddleware],
          handler: createHandler(({ req }) => ({
            test: (req as unknown as Record<string, unknown>).__test,
          })),
        },
      ]);

      const server = new Server(routes);

      const res = await server.fetch(new Request("http://localhost/protected"));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({ test: "middleware-ok" });
    });

    it("手动调用 compile() 应该预编译所有路由", async () => {
      const routes = defineRoutes([
        {
          method: "GET",
          path: "/test",
          handler: createHandler(() => ({ compiled: true })),
        },
      ]);

      const server = new Server(routes);

      // 手动编译
      server.compile();

      const res = await server.fetch(new Request("http://localhost/test"));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({ compiled: true });
    });

    it("带全局中间件时需要手动编译", async () => {
      const globalMiddleware: Middleware = async (req, next) => {
        (req as unknown as Record<string, unknown>).__global = "global-ok";
        return next(req);
      };

      const routes = defineRoutes([
        {
          method: "GET",
          path: "/with-global",
          handler: createHandler(({ req }) => ({
            global: (req as unknown as Record<string, unknown>).__global,
          })),
        },
      ]);

      const server = new Server(routes);
      server.use(globalMiddleware);
      server.compile(); // 添加全局中间件后需要重新编译

      const res = await server.fetch(
        new Request("http://localhost/with-global"),
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({ global: "global-ok" });
    });
  });

  describe("边界情况测试", () => {
    it("404 路由应该正常返回", async () => {
      const server = new Server([]);

      const res = await server.fetch(new Request("http://localhost/not-found"));
      expect(res.status).toBe(404);
    });

    it("405 方法不允许应该正常返回", async () => {
      const routes = defineRoutes([
        {
          method: "GET",
          path: "/only-get",
          handler: createHandler(() => ({ ok: true })),
        },
      ]);

      const server = new Server(routes);

      const res = await server.fetch(
        new Request("http://localhost/only-get", { method: "POST" }),
      );
      expect(res.status).toBe(405);
    });

    it("通配符路由应该正常工作", async () => {
      const routes = defineRoutes([
        {
          method: "GET",
          path: "/files/*",
          handler: createHandler(({ params }) => ({
            file: params["*"],
          })),
        },
      ]);

      const server = new Server(routes);

      const res = await server.fetch(
        new Request("http://localhost/files/path/to/file.txt"),
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({ file: "path/to/file.txt" });
    });
  });
});
