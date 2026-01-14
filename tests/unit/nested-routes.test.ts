import { describe, it, expect } from "vitest";
import { Server } from "../../src/server";
import { defineRoutes, defineRoute } from "../../src/defineRoute";

// 模拟中间件
const mockMiddleware = (name: string) => {
  return async (req: Request, next: () => Promise<Response>) => {
    const response = await next();
    // 将中间件名称添加到响应头中，用于验证执行顺序
    const existing = response.headers.get("X-Middleware") || "";
    response.headers.set(
      "X-Middleware",
      existing ? `${existing},${name}` : name,
    );
    return response;
  };
};

describe("嵌套路由功能", () => {
  describe("路由扁平化", () => {
    it("应该正确扁平化嵌套路由", () => {
      const routes = defineRoutes([
        defineRoute({
          path: "/admin",
          middleware: [mockMiddleware("auth")],
          children: [
            defineRoute({
              path: "/users",
              method: "GET",
              handler: () => ({ message: "获取用户" }),
              middleware: [mockMiddleware("audit")],
            }),
          ],
        }),
      ]);

      expect(routes).toHaveLength(1);
      expect(routes[0].path).toBe("/admin/users");
      expect(routes[0].method).toBe("GET");
      expect(routes[0].middleware).toHaveLength(2);
    });

    it("应该支持多层嵌套", () => {
      const routes = defineRoutes([
        defineRoute({
          path: "/api",
          middleware: [mockMiddleware("cors")],
          children: [
            defineRoute({
              path: "/v1",
              middleware: [mockMiddleware("version")],
              children: [
                defineRoute({
                  path: "/users",
                  method: "GET",
                  handler: () => ({ message: "获取用户v1" }),
                }),
              ],
            }),
          ],
        }),
      ]);

      expect(routes).toHaveLength(1);
      expect(routes[0].path).toBe("/api/v1/users");
      expect(routes[0].middleware).toHaveLength(2);
    });

    it("应该正确处理路径拼接", () => {
      const routes = defineRoutes([
        defineRoute({
          path: "/shop",
          children: [
            defineRoute({
              path: "/products",
              children: [
                defineRoute({
                  path: "",
                  method: "GET",
                  handler: () => ({ message: "产品列表" }),
                }),
                defineRoute({
                  path: "/:id",
                  method: "GET",
                  handler: () => ({ message: "产品详情" }),
                }),
              ],
            }),
          ],
        }),
      ]);

      expect(routes).toHaveLength(2);
      expect(routes[0].path).toBe("/shop/products");
      expect(routes[1].path).toBe("/shop/products/:id");
    });

    it("应该正确合并中间件链", () => {
      const routes = defineRoutes([
        defineRoute({
          path: "/admin",
          middleware: [mockMiddleware("auth"), mockMiddleware("rateLimit")],
          children: [
            defineRoute({
              path: "/dashboard",
              method: "GET",
              handler: () => ({ message: "仪表板" }),
              middleware: [mockMiddleware("audit"), mockMiddleware("cache")],
            }),
          ],
        }),
      ]);

      expect(routes[0].middleware).toHaveLength(4);
    });
  });

  describe("服务器集成", () => {
    it("应该正确处理嵌套路由请求", async () => {
      const routes = defineRoutes([
        defineRoute({
          path: "/api",
          middleware: [mockMiddleware("cors")],
          children: [
            defineRoute({
              path: "/v1",
              middleware: [mockMiddleware("version")],
              children: [
                defineRoute({
                  path: "/users",
                  method: "GET",
                  handler: () => ({ message: "获取用户v1" }),
                }),
              ],
            }),
          ],
        }),
      ]);

      const server = new Server(routes);

      const req = new Request("http://localhost:3000/api/v1/users", {
        method: "GET",
      });

      const response = await server.fetch(req);

      expect(response.status).toBe(200);
      // 验证中间件执行顺序：cors,version
      const middlewareHeader = response.headers.get("X-Middleware");
      expect(middlewareHeader).toContain("cors");
      expect(middlewareHeader).toContain("version");

      const body = await response.json();
      expect(body.message).toBe("获取用户v1");
    });

    it("应该支持混合路由类型", async () => {
      const routes = defineRoutes([
        // 普通路由
        defineRoute({
          path: "/health",
          method: "GET",
          handler: () => ({ message: "健康检查" }),
        }),
        // 嵌套路由
        defineRoute({
          path: "/admin",
          middleware: [mockMiddleware("auth")],
          children: [
            defineRoute({
              path: "/users",
              method: "GET",
              handler: () => ({ message: "管理员用户列表" }),
            }),
          ],
        }),
      ]);

      const server = new Server(routes);

      // 测试普通路由
      const healthReq = new Request("http://localhost:3000/health", {
        method: "GET",
      });
      const healthRes = await server.fetch(healthReq);
      expect(healthRes.status).toBe(200);

      // 测试嵌套路由
      const adminReq = new Request("http://localhost:3000/admin/users", {
        method: "GET",
      });
      const adminRes = await server.fetch(adminReq);
      expect(adminRes.status).toBe(200);
      expect(adminRes.headers.get("X-Middleware")).toBe("auth");
    });

    it("应该正确处理404错误", async () => {
      const routes = defineRoutes([
        defineRoute({
          path: "/api",
          children: [
            defineRoute({
              path: "/users",
              method: "GET",
              handler: () => ({ message: "用户列表" }),
            }),
          ],
        }),
      ]);

      const server = new Server(routes);

      const req = new Request("http://localhost:3000/api/nonexistent", {
        method: "GET",
      });

      const response = await server.fetch(req);
      expect(response.status).toBe(404);
    });

    it("应该正确处理405错误", async () => {
      const routes = defineRoutes([
        defineRoute({
          path: "/api",
          children: [
            defineRoute({
              path: "/users",
              method: "GET",
              handler: () => ({ message: "用户列表" }),
            }),
          ],
        }),
      ]);

      const server = new Server(routes);

      const req = new Request("http://localhost:3000/api/users", {
        method: "POST",
      });

      const response = await server.fetch(req);
      expect(response.status).toBe(405);
    });
  });

  describe("边缘情况", () => {
    it("应该处理空的children数组", () => {
      const routes = defineRoutes([
        defineRoute({
          path: "/api",
          children: [],
        }),
      ]);
      expect(routes).toHaveLength(0);
    });

    it("应该处理没有中间件的路由", () => {
      const routes = defineRoutes([
        defineRoute({
          path: "/api",
          children: [
            defineRoute({
              path: "/users",
              method: "GET",
              handler: () => ({ message: "用户列表" }),
            }),
          ],
        }),
      ]);
      expect(routes[0].middleware).toBeUndefined();
    });

    it("应该处理根路径", () => {
      const routes = defineRoutes([
        defineRoute({
          path: "/",
          children: [
            defineRoute({
              path: "/",
              method: "GET",
              handler: () => ({ message: "首页" }),
            }),
          ],
        }),
      ]);
      // 路径应该合并为 "/"
      expect(routes[0].path).toBe("//");
    });
  });
});
