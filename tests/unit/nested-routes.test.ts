import { describe, it, expect } from "vitest";
import { Server } from "../../src/server";
import { flattenNestedRoutes } from "../../src/router";
import type { NestedRoute, Route } from "../../src/types";

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

// 模拟处理器
const mockHandler = (message: string) => {
  return async (req: Request) => {
    return new Response(JSON.stringify({ message }), {
      headers: { "Content-Type": "application/json" },
    });
  };
};

describe("嵌套路由功能", () => {
  describe("路由扁平化", () => {
    it("应该正确扁平化嵌套路由", () => {
      const routes: NestedRoute[] = [
        {
          path: "/admin",
          middleware: [mockMiddleware("auth")],
          children: [
            {
              path: "/users",
              method: "GET",
              handler: mockHandler("获取用户"),
              middleware: [mockMiddleware("audit")],
            },
          ],
        },
      ];

      const flattened = flattenNestedRoutes(routes);

      expect(flattened).toHaveLength(1);
      expect(flattened[0].fullPath).toBe("/admin/users");
      expect(flattened[0].method).toBe("GET");
      expect(flattened[0].middlewareChain).toHaveLength(2);
      expect(flattened[0].middlewareChain[0]).toBeDefined();
      expect(flattened[0].middlewareChain[1]).toBeDefined();
    });

    it("应该支持多层嵌套", () => {
      const routes: NestedRoute[] = [
        {
          path: "/api",
          middleware: [mockMiddleware("cors")],
          children: [
            {
              path: "/v1",
              middleware: [mockMiddleware("version")],
              children: [
                {
                  path: "/users",
                  method: "GET",
                  handler: mockHandler("获取用户v1"),
                },
              ],
            },
          ],
        },
      ];

      const flattened = flattenNestedRoutes(routes);

      expect(flattened).toHaveLength(1);
      expect(flattened[0].fullPath).toBe("/api/v1/users");
      expect(flattened[0].middlewareChain).toHaveLength(2);
    });

    it("应该正确处理路径拼接", () => {
      const routes: NestedRoute[] = [
        {
          path: "/shop",
          children: [
            {
              path: "/products",
              children: [
                {
                  path: "/",
                  method: "GET",
                  handler: mockHandler("产品列表"),
                },
                {
                  path: "/:id",
                  method: "GET",
                  handler: mockHandler("产品详情"),
                },
              ],
            },
          ],
        },
      ];

      const flattened = flattenNestedRoutes(routes);

      expect(flattened).toHaveLength(2);
      // normalizePath 会去除末尾斜杠
      expect(flattened[0].fullPath).toBe("/shop/products");
      expect(flattened[1].fullPath).toBe("/shop/products/:id");
    });

    it("应该正确合并中间件链", () => {
      const routes: NestedRoute[] = [
        {
          path: "/admin",
          middleware: [mockMiddleware("auth"), mockMiddleware("rateLimit")],
          children: [
            {
              path: "/dashboard",
              method: "GET",
              handler: mockHandler("仪表板"),
              middleware: [mockMiddleware("audit"), mockMiddleware("cache")],
            },
          ],
        },
      ];

      const flattened = flattenNestedRoutes(routes);

      expect(flattened[0].middlewareChain).toHaveLength(4);
      // 顺序应该是：父中间件 + 子中间件
      expect(flattened[0].middlewareChain[0]).toBeDefined();
      expect(flattened[0].middlewareChain[1]).toBeDefined();
      expect(flattened[0].middlewareChain[2]).toBeDefined();
      expect(flattened[0].middlewareChain[3]).toBeDefined();
    });
  });

  describe("服务器集成", () => {
    it("应该正确处理嵌套路由请求", async () => {
      const routes: NestedRoute[] = [
        {
          path: "/api",
          middleware: [mockMiddleware("cors")],
          children: [
            {
              path: "/v1",
              middleware: [mockMiddleware("version")],
              children: [
                {
                  path: "/users",
                  method: "GET",
                  handler: mockHandler("获取用户v1"),
                },
              ],
            },
          ],
        },
      ];

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
      const routes: (Route | NestedRoute)[] = [
        // 普通路由
        {
          path: "/health",
          method: "GET",
          handler: mockHandler("健康检查"),
        },
        // 嵌套路由
        {
          path: "/admin",
          middleware: [mockMiddleware("auth")],
          children: [
            {
              path: "/users",
              method: "GET",
              handler: mockHandler("管理员用户列表"),
            },
          ],
        },
      ];

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
      const routes: NestedRoute[] = [
        {
          path: "/api",
          children: [
            {
              path: "/users",
              method: "GET",
              handler: mockHandler("用户列表"),
            },
          ],
        },
      ];

      const server = new Server(routes);

      const req = new Request("http://localhost:3000/api/nonexistent", {
        method: "GET",
      });

      const response = await server.fetch(req);
      expect(response.status).toBe(404);
    });

    it("应该正确处理405错误", async () => {
      const routes: NestedRoute[] = [
        {
          path: "/api",
          children: [
            {
              path: "/users",
              method: "GET",
              handler: mockHandler("用户列表"),
            },
          ],
        },
      ];

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
      const routes: NestedRoute[] = [
        {
          path: "/api",
          children: [],
        },
      ];

      const flattened = flattenNestedRoutes(routes);
      expect(flattened).toHaveLength(0);
    });

    it("应该处理没有中间件的路由", () => {
      const routes: NestedRoute[] = [
        {
          path: "/api",
          children: [
            {
              path: "/users",
              method: "GET",
              handler: mockHandler("用户列表"),
            },
          ],
        },
      ];

      const flattened = flattenNestedRoutes(routes);
      expect(flattened[0].middlewareChain).toHaveLength(0);
    });

    it("应该处理根路径", () => {
      const routes: NestedRoute[] = [
        {
          path: "/",
          children: [
            {
              path: "/",
              method: "GET",
              handler: mockHandler("首页"),
            },
          ],
        },
      ];

      const flattened = flattenNestedRoutes(routes);
      // normalizePath 会合并重复斜杠
      expect(flattened[0].fullPath).toBe("/");
    });
  });
});
