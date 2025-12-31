/**
 * HTTP 宏基准测试
 *
 * 测试真实 HTTP 请求处理性能
 * 使用内存中的请求模拟，不涉及网络
 */

import { BenchSuite, formatNumber } from "../lib/bench";
import { Server } from "../../src/server";
import { createHandler } from "../../src/utils/create-handler";
import { Type } from "@sinclair/typebox";

async function main() {
  console.log("🌐 HTTP 宏基准测试");
  console.log("=".repeat(50));

  // 创建真实的应用场景服务器
  const server = new Server([
    // 健康检查
    {
      method: "GET",
      path: "/health",
      handler: () => new Response("OK"),
    },

    // JSON API
    {
      method: "GET",
      path: "/api/v1/users",
      handler: () =>
        new Response(
          JSON.stringify({
            users: [
              { id: 1, name: "Alice" },
              { id: 2, name: "Bob" },
            ],
            total: 2,
          }),
          { headers: { "Content-Type": "application/json" } },
        ),
    },

    // 带参数的 API
    {
      method: "GET",
      path: "/api/v1/users/:id",
      handler: createHandler({
        params: Type.Object({ id: Type.String() }),
      })(({ params }) => ({
        id: parseInt(params.id),
        name: `User ${params.id}`,
        email: `user${params.id}@example.com`,
      })),
    },

    // 创建资源
    {
      method: "POST",
      path: "/api/v1/users",
      handler: createHandler({
        body: Type.Object({
          name: Type.String(),
          email: Type.String(),
        }),
      })(({ body }) => ({
        data: {
          id: Date.now(),
          name: body.name,
          email: body.email,
        },
        status: 201,
      })),
    },

    // 复杂嵌套路由
    {
      method: "GET",
      path: "/api/v1/organizations/:orgId/projects/:projectId/tasks/:taskId",
      handler: (req) => {
        const params = (req as unknown as { params: Record<string, string> })
          .params;
        return new Response(
          JSON.stringify({
            orgId: params.orgId,
            projectId: params.projectId,
            taskId: params.taskId,
          }),
          { headers: { "Content-Type": "application/json" } },
        );
      },
    },

    // 静态文件服务
    {
      method: "GET",
      path: "/static/*filepath",
      handler: (req) => {
        const params = (req as unknown as { params: Record<string, string> })
          .params;
        return new Response(`File: ${params.filepath}`, {
          headers: { "Content-Type": "text/plain" },
        });
      },
    },
  ]);

  // 添加全局中间件
  server.use(async (req, next) => {
    // 模拟请求日志
    return next();
  });

  const suite = new BenchSuite("HTTP 请求处理");

  // 1. 健康检查 (最简场景)
  await suite.add({ name: "GET /health", iterations: 50000 }, async () => {
    await server.fetch(new Request("http://localhost/health"));
  });

  // 2. JSON API (常见场景)
  await suite.add(
    { name: "GET /api/v1/users (JSON)", iterations: 50000 },
    async () => {
      await server.fetch(new Request("http://localhost/api/v1/users"));
    },
  );

  // 3. 带参数 API (RESTful 场景)
  await suite.add(
    { name: "GET /api/v1/users/:id", iterations: 50000 },
    async () => {
      await server.fetch(new Request("http://localhost/api/v1/users/123"));
    },
  );

  // 4. POST 创建 (写入场景)
  await suite.add(
    { name: "POST /api/v1/users", iterations: 20000 },
    async () => {
      await server.fetch(
        new Request("http://localhost/api/v1/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "New User",
            email: "newuser@example.com",
          }),
        }),
      );
    },
  );

  // 5. 复杂嵌套路由
  await suite.add(
    { name: "GET /.../tasks/:taskId (深层嵌套)", iterations: 50000 },
    async () => {
      await server.fetch(
        new Request(
          "http://localhost/api/v1/organizations/org1/projects/proj1/tasks/task1",
        ),
      );
    },
  );

  // 6. 通配符路由
  await suite.add(
    { name: "GET /static/*filepath", iterations: 50000 },
    async () => {
      await server.fetch(
        new Request("http://localhost/static/assets/js/app.bundle.js"),
      );
    },
  );

  suite.print();

  // 并发测试
  console.log("\n" + "=".repeat(50));
  console.log("🚀 并发处理测试");
  console.log("=".repeat(50));

  const concurrencyLevels = [10, 50, 100, 200];

  for (const concurrency of concurrencyLevels) {
    const totalRequests = 10000;
    const requestsPerWorker = Math.ceil(totalRequests / concurrency);

    const start = performance.now();

    const workers = Array.from({ length: concurrency }, async () => {
      for (let i = 0; i < requestsPerWorker; i++) {
        await server.fetch(new Request("http://localhost/api/v1/users/123"));
      }
    });

    await Promise.all(workers);

    const end = performance.now();
    const duration = end - start;
    const rps = Math.round(totalRequests / (duration / 1000));

    console.log(
      `\n并发 ${concurrency}: ${formatNumber(rps)} req/sec (${duration.toFixed(0)}ms)`,
    );
  }

  // 混合负载测试
  console.log("\n" + "=".repeat(50));
  console.log("🎲 混合负载测试");
  console.log("=".repeat(50));

  const requests = [
    () => new Request("http://localhost/health"),
    () => new Request("http://localhost/api/v1/users"),
    () => new Request("http://localhost/api/v1/users/123"),
    () =>
      new Request("http://localhost/api/v1/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Test", email: "test@example.com" }),
      }),
    () => new Request("http://localhost/static/assets/style.css"),
  ];

  const mixedTotal = 50000;
  const mixedStart = performance.now();

  for (let i = 0; i < mixedTotal; i++) {
    const reqFactory = requests[i % requests.length];
    await server.fetch(reqFactory());
  }

  const mixedEnd = performance.now();
  const mixedDuration = mixedEnd - mixedStart;
  const mixedRps = Math.round(mixedTotal / (mixedDuration / 1000));

  console.log(`\n混合负载 (${requests.length} 种请求类型):`);
  console.log(`  总请求: ${formatNumber(mixedTotal)}`);
  console.log(`  耗时: ${mixedDuration.toFixed(0)}ms`);
  console.log(`  RPS: ${formatNumber(mixedRps)}`);
}

main().catch(console.error);
