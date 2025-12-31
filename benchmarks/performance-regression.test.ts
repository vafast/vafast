/**
 * 性能回归测试
 *
 * 确保框架性能不会在代码变更后退化
 * 作为 CI/CD 流程的一部分运行
 *
 * 测试策略:
 * 1. 预热阶段消除 JIT 影响
 * 2. 多次运行取平均值
 * 3. 设置合理的阈值
 */

import { describe, it, expect, beforeAll } from "vitest";
import { Server } from "../src/server";
import { createHandler } from "../src/utils/create-handler";
import { RadixRouter } from "../src/router/radix-tree";
import { Type } from "@sinclair/typebox";

// 性能阈值配置 (毫秒)
const THRESHOLDS = {
  // 路由器操作
  routerStaticMatch: 0.005, // 静态路由匹配 < 5µs
  routerDynamicMatch: 0.01, // 动态路由匹配 < 10µs
  routerRegister: 0.05, // 路由注册 < 50µs

  // 服务器请求处理
  serverSimpleRequest: 0.05, // 简单请求 < 50µs
  serverMiddleware: 0.1, // 带中间件 < 100µs
  serverSchemaValidation: 0.5, // Schema 验证 < 500µs

  // 响应生成
  responseJson: 0.02, // JSON 响应 < 20µs
};

// 测试配置
const TEST_CONFIG = {
  warmup: 100,
  iterations: 1000,
};

/**
 * 性能测试辅助函数
 */
async function measurePerformance(
  fn: () => void | Promise<void>,
  iterations: number
): Promise<number> {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    await fn();
  }
  const end = performance.now();
  return (end - start) / iterations;
}

/**
 * 同步版本
 */
function measurePerformanceSync(fn: () => void, iterations: number): number {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const end = performance.now();
  return (end - start) / iterations;
}

describe("性能回归测试", () => {
  describe("RadixRouter 性能", () => {
    let router: RadixRouter;
    const handler = () => new Response("OK");

    beforeAll(() => {
      router = new RadixRouter();
      // 注册测试路由
      router.register("GET", "/", handler);
      router.register("GET", "/users", handler);
      router.register("GET", "/users/:id", handler);
      router.register("GET", "/users/:id/posts/:postId", handler);
      router.register("GET", "/files/*filepath", handler);

      // 预热
      for (let i = 0; i < TEST_CONFIG.warmup; i++) {
        router.match("GET", "/users/123");
      }
    });

    it("静态路由匹配性能", () => {
      const avgTime = measurePerformanceSync(
        () => router.match("GET", "/users"),
        TEST_CONFIG.iterations
      );

      expect(avgTime).toBeLessThan(THRESHOLDS.routerStaticMatch);
    });

    it("动态参数匹配性能", () => {
      const avgTime = measurePerformanceSync(
        () => router.match("GET", "/users/12345"),
        TEST_CONFIG.iterations
      );

      expect(avgTime).toBeLessThan(THRESHOLDS.routerDynamicMatch);
    });

    it("多参数匹配性能", () => {
      const avgTime = measurePerformanceSync(
        () => router.match("GET", "/users/100/posts/200"),
        TEST_CONFIG.iterations
      );

      expect(avgTime).toBeLessThan(THRESHOLDS.routerDynamicMatch * 2);
    });

    it("通配符匹配性能", () => {
      const avgTime = measurePerformanceSync(
        () => router.match("GET", "/files/path/to/deep/file.txt"),
        TEST_CONFIG.iterations
      );

      expect(avgTime).toBeLessThan(THRESHOLDS.routerDynamicMatch);
    });

    it("路由注册性能", () => {
      const avgTime = measurePerformanceSync(() => {
        const testRouter = new RadixRouter();
        testRouter.register("GET", "/api/v1/test/:id", handler);
      }, TEST_CONFIG.iterations);

      expect(avgTime).toBeLessThan(THRESHOLDS.routerRegister);
    });
  });

  describe("Server 请求处理性能", () => {
    let server: Server;

    beforeAll(() => {
      server = new Server([
        {
          method: "GET",
          path: "/",
          handler: () => new Response("Hello World"),
        },
        {
          method: "GET",
          path: "/with-middleware",
          middleware: [
            async (_req, next) => next(),
            async (_req, next) => next(),
          ],
          handler: () => new Response("OK"),
        },
        {
          method: "GET",
          path: "/users/:id",
          handler: (req) => {
            const params = (req as unknown as { params: Record<string, string> })
              .params;
            return new Response(JSON.stringify({ id: params.id }), {
              headers: { "Content-Type": "application/json" },
            });
          },
        },
        {
          method: "POST",
          path: "/users",
          handler: createHandler({
            body: Type.Object({
              name: Type.String(),
              email: Type.String(),
            }),
          })(({ body }) => ({
            id: 1,
            name: body.name,
            email: body.email,
          })),
        },
      ]);

      // 预热
      const warmupReq = new Request("http://localhost/");
      for (let i = 0; i < TEST_CONFIG.warmup; i++) {
        server.fetch(warmupReq);
      }
    });

    it("简单请求处理性能", async () => {
      const avgTime = await measurePerformance(async () => {
        const req = new Request("http://localhost/");
        await server.fetch(req);
      }, TEST_CONFIG.iterations);

      expect(avgTime).toBeLessThan(THRESHOLDS.serverSimpleRequest);
    });

    it("带中间件请求处理性能", async () => {
      const avgTime = await measurePerformance(async () => {
        const req = new Request("http://localhost/with-middleware");
        await server.fetch(req);
      }, TEST_CONFIG.iterations);

      expect(avgTime).toBeLessThan(THRESHOLDS.serverMiddleware);
    });

    it("动态参数请求处理性能", async () => {
      const avgTime = await measurePerformance(async () => {
        const req = new Request("http://localhost/users/12345");
        await server.fetch(req);
      }, TEST_CONFIG.iterations);

      expect(avgTime).toBeLessThan(THRESHOLDS.serverMiddleware);
    });

    it("Schema 验证请求处理性能", async () => {
      const avgTime = await measurePerformance(async () => {
        const req = new Request("http://localhost/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Alice",
            email: "alice@example.com",
          }),
        });
        await server.fetch(req);
      }, Math.floor(TEST_CONFIG.iterations / 5)); // Schema 验证较慢，减少迭代

      expect(avgTime).toBeLessThan(THRESHOLDS.serverSchemaValidation);
    });
  });

  describe("响应生成性能", () => {
    it("JSON 响应生成性能", () => {
      const data = {
        users: [
          { id: 1, name: "Alice" },
          { id: 2, name: "Bob" },
        ],
        total: 2,
      };

      const avgTime = measurePerformanceSync(() => {
        new Response(JSON.stringify(data), {
          headers: { "Content-Type": "application/json" },
        });
      }, TEST_CONFIG.iterations);

      expect(avgTime).toBeLessThan(THRESHOLDS.responseJson);
    });

    it("大型 JSON 响应性能", () => {
      const data = {
        users: Array.from({ length: 100 }, (_, i) => ({
          id: i,
          name: `User ${i}`,
          email: `user${i}@example.com`,
        })),
        total: 100,
      };

      const avgTime = measurePerformanceSync(() => {
        new Response(JSON.stringify(data), {
          headers: { "Content-Type": "application/json" },
        });
      }, TEST_CONFIG.iterations);

      // 大型响应允许更长时间
      expect(avgTime).toBeLessThan(THRESHOLDS.responseJson * 10);
    });
  });

  describe("路由数量扩展性", () => {
    it("100 路由时性能不应显著退化", async () => {
      const routes = Array.from({ length: 100 }, (_, i) => ({
        method: "GET" as const,
        path: `/route-${i}`,
        handler: () => new Response(`Route ${i}`),
      }));

      const server = new Server(routes);

      // 预热
      for (let i = 0; i < 100; i++) {
        await server.fetch(new Request("http://localhost/route-50"));
      }

      const avgTime = await measurePerformance(async () => {
        await server.fetch(new Request("http://localhost/route-50"));
      }, TEST_CONFIG.iterations);

      // 100 路由时性能应该与少量路由相近
      expect(avgTime).toBeLessThan(THRESHOLDS.serverSimpleRequest * 2);
    });

    it("500 路由时性能不应显著退化", async () => {
      const routes = Array.from({ length: 500 }, (_, i) => ({
        method: "GET" as const,
        path: `/route-${i}`,
        handler: () => new Response(`Route ${i}`),
      }));

      const server = new Server(routes);

      // 预热
      for (let i = 0; i < 100; i++) {
        await server.fetch(new Request("http://localhost/route-250"));
      }

      const avgTime = await measurePerformance(async () => {
        await server.fetch(new Request("http://localhost/route-250"));
      }, TEST_CONFIG.iterations);

      // Radix Tree 保证 O(k) 复杂度，500 路由也应该很快
      expect(avgTime).toBeLessThan(THRESHOLDS.serverSimpleRequest * 3);
    });
  });
});
