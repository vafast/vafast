/**
 * 性能回归测试
 *
 * 这些测试确保框架的性能不会在代码变更后退化
 * 通常作为CI/CD流程的一部分运行
 */

import { describe, it, expect } from "bun:test";
import { Server } from "../../../src/server";

// 性能基准配置
const PERFORMANCE_THRESHOLDS = {
  routeMatching: 0.1, // 路由匹配时间阈值 (ms)
  middlewareChain: 0.5, // 中间件链执行时间阈值 (ms)
  responseGeneration: 0.2, // 响应生成时间阈值 (ms)
};

describe("性能回归测试", () => {
  it("路由匹配性能不应退化", async () => {
    const routes = [
      {
        method: "GET",
        path: "/users/:id",
        handler: () => new Response("OK"),
      },
      {
        method: "POST",
        path: "/users",
        handler: () => new Response("Created", { status: 201 }),
      },
    ];

    const server = new Server(routes);

    // 测试路由匹配性能
    const startTime = performance.now();

    for (let i = 0; i < 1000; i++) {
      const request = new Request(`http://localhost/users/${i}`);
      await server.fetch(request);
    }

    const endTime = performance.now();
    const avgTime = (endTime - startTime) / 1000;

    expect(avgTime).toBeLessThan(PERFORMANCE_THRESHOLDS.routeMatching);
  });

  it("中间件链性能不应退化", async () => {
    const middleware = [
      async (req: Request, next: () => Promise<Response>) => {
        const start = performance.now();
        const response = await next();
        const duration = performance.now() - start;
        response.headers.set("X-Processing-Time", duration.toString());
        return response;
      },
      async (req: Request, next: () => Promise<Response>) => {
        return next();
      },
    ];

    const routes = [
      {
        method: "GET",
        path: "/test",
        middleware,
        handler: () => new Response("OK"),
      },
    ];

    const server = new Server(routes);

    // 测试中间件链性能
    const startTime = performance.now();

    for (let i = 0; i < 100; i++) {
      const request = new Request("http://localhost/test");
      await server.fetch(request);
    }

    const endTime = performance.now();
    const avgTime = (endTime - startTime) / 100;

    expect(avgTime).toBeLessThan(PERFORMANCE_THRESHOLDS.middlewareChain);
  });

  it("响应生成性能不应退化", async () => {
    const routes = [
      {
        method: "GET",
        path: "/complex-response",
        handler: () => {
          const data = {
            users: Array.from({ length: 100 }, (_, i) => ({
              id: i,
              name: `User ${i}`,
              email: `user${i}@example.com`,
            })),
            timestamp: new Date().toISOString(),
            metadata: {
              version: "1.0.0",
              environment: "test",
            },
          };

          return new Response(JSON.stringify(data), {
            headers: { "Content-Type": "application/json" },
          });
        },
      },
    ];

    const server = new Server(routes);

    // 测试响应生成性能
    const startTime = performance.now();

    for (let i = 0; i < 500; i++) {
      const request = new Request("http://localhost/complex-response");
      await server.fetch(request);
    }

    const endTime = performance.now();
    const avgTime = (endTime - startTime) / 500;

    expect(avgTime).toBeLessThan(PERFORMANCE_THRESHOLDS.responseGeneration);
  });
});
