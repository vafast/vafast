/**
 * 服务器完整请求处理微基准测试
 *
 * 测试 Server.fetch 的端到端性能
 */

import { BenchSuite } from "../lib/bench";
import { Server } from "../../src/server";
import { createHandler } from "../../src/utils/create-handler";
import { Type } from "@sinclair/typebox";
import type { Middleware } from "../../src/types";

async function main() {
  console.log("🚀 服务器完整请求处理基准测试");
  console.log("=".repeat(50));

  // 准备 Schema
  const UserSchema = Type.Object({
    name: Type.String(),
    email: Type.String(),
  });

  // 中间件
  const logMiddleware: Middleware = async (req, next) => {
    return next();
  };

  const authMiddleware: Middleware = async (req, next) => {
    const token = req.headers.get("Authorization");
    if (token) {
      return next();
    }
    return new Response("Unauthorized", { status: 401 });
  };

  // 创建服务器
  const server = new Server([
    // 简单静态路由
    {
      method: "GET",
      path: "/",
      handler: () => new Response("Hello World"),
    },
    // 带中间件的路由
    {
      method: "GET",
      path: "/with-middleware",
      middleware: [logMiddleware],
      handler: () => new Response("OK"),
    },
    // 带多个中间件
    {
      method: "GET",
      path: "/multi-middleware",
      middleware: [logMiddleware, authMiddleware],
      handler: () => new Response("OK"),
    },
    // 动态参数路由
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
    // 带 Schema 验证的路由
    {
      method: "POST",
      path: "/users",
      handler: createHandler(
        { body: UserSchema },
        ({ body }) => ({
          id: 1,
          name: body.name,
          email: body.email,
        }),
      ),
    },
    // 通配符路由
    {
      method: "GET",
      path: "/files/*filepath",
      handler: (req) => {
        const params = (req as unknown as { params: Record<string, string> })
          .params;
        return new Response(params.filepath);
      },
    },
  ]);

  const suite = new BenchSuite("Server.fetch 端到端性能");

  // 1. 简单静态路由
  await suite.add({ name: "GET / (静态路由)", iterations: 50000 }, async () => {
    const req = new Request("http://localhost/");
    await server.fetch(req);
  });

  // 2. 带单个中间件
  await suite.add(
    { name: "GET /with-middleware (1 中间件)", iterations: 50000 },
    async () => {
      const req = new Request("http://localhost/with-middleware");
      await server.fetch(req);
    },
  );

  // 3. 带多个中间件
  await suite.add(
    { name: "GET /multi-middleware (2 中间件)", iterations: 50000 },
    async () => {
      const req = new Request("http://localhost/multi-middleware", {
        headers: { Authorization: "Bearer token" },
      });
      await server.fetch(req);
    },
  );

  // 4. 动态参数
  await suite.add(
    { name: "GET /users/:id (动态参数)", iterations: 50000 },
    async () => {
      const req = new Request("http://localhost/users/12345");
      await server.fetch(req);
    },
  );

  // 5. 带 Schema 验证
  await suite.add(
    { name: "POST /users (Schema 验证)", iterations: 20000 },
    async () => {
      const req = new Request("http://localhost/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Alice",
          email: "alice@example.com",
        }),
      });
      await server.fetch(req);
    },
  );

  // 6. 通配符路由
  await suite.add(
    { name: "GET /files/*filepath (通配符)", iterations: 50000 },
    async () => {
      const req = new Request("http://localhost/files/path/to/file.txt");
      await server.fetch(req);
    },
  );

  // 7. 404 不存在
  await suite.add(
    { name: "GET /nonexistent (404)", iterations: 50000 },
    async () => {
      const req = new Request("http://localhost/nonexistent");
      await server.fetch(req);
    },
  );

  // 8. 405 方法不允许
  await suite.add({ name: "POST / (405)", iterations: 50000 }, async () => {
    const req = new Request("http://localhost/", { method: "POST" });
    await server.fetch(req);
  });

  suite.print();

  // 路由数量对性能的影响
  console.log("\n" + "=".repeat(50));
  console.log("📊 路由数量对性能影响测试");
  console.log("=".repeat(50));

  const routeCounts = [10, 50, 100, 500];

  for (const count of routeCounts) {
    const routes = Array.from({ length: count }, (_, i) => ({
      method: "GET" as const,
      path: `/route-${i}`,
      handler: () => new Response(`Route ${i}`),
    }));

    // 添加一些动态路由
    routes.push({
      method: "GET" as const,
      path: "/test/:id",
      handler: () => new Response("Dynamic"),
    });

    const testServer = new Server(routes);

    // 测试第一个路由
    const startFirst = performance.now();
    for (let i = 0; i < 10000; i++) {
      const req = new Request("http://localhost/route-0");
      await testServer.fetch(req);
    }
    const endFirst = performance.now();
    const firstOps = 10000 / ((endFirst - startFirst) / 1000);

    // 测试最后一个静态路由
    const startLast = performance.now();
    for (let i = 0; i < 10000; i++) {
      const req = new Request(`http://localhost/route-${count - 1}`);
      await testServer.fetch(req);
    }
    const endLast = performance.now();
    const lastOps = 10000 / ((endLast - startLast) / 1000);

    // 测试动态路由
    const startDynamic = performance.now();
    for (let i = 0; i < 10000; i++) {
      const req = new Request("http://localhost/test/123");
      await testServer.fetch(req);
    }
    const endDynamic = performance.now();
    const dynamicOps = 10000 / ((endDynamic - startDynamic) / 1000);

    console.log(`\n${count} 路由:`);
    console.log(`  第一个路由: ${(firstOps / 1000).toFixed(2)}K ops/sec`);
    console.log(`  最后路由:   ${(lastOps / 1000).toFixed(2)}K ops/sec`);
    console.log(`  动态路由:   ${(dynamicOps / 1000).toFixed(2)}K ops/sec`);
  }
}

main().catch(console.error);
