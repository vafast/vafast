/**
 * 路由器微基准测试
 *
 * 测试 RadixRouter 的各种操作性能
 */

import { BenchSuite, printResult } from "../lib/bench";
import { RadixRouter } from "../../src/router/radix-tree";

async function main() {
  console.log("🚀 路由器微基准测试");
  console.log("=".repeat(50));

  // 创建测试路由器
  const router = new RadixRouter();
  const handler = () => new Response("OK");

  // 注册测试路由
  const staticRoutes = [
    "/",
    "/users",
    "/users/list",
    "/api/v1/health",
    "/api/v1/status",
    "/api/v2/config",
  ];

  const dynamicRoutes = [
    "/users/:id",
    "/users/:id/profile",
    "/posts/:postId/comments/:commentId",
    "/api/v1/users/:userId/orders/:orderId",
  ];

  const wildcardRoutes = [
    "/files/*",
    "/static/*filepath",
    "/api/*rest",
  ];

  // 注册所有路由
  staticRoutes.forEach((path) => router.register("GET", path, handler));
  dynamicRoutes.forEach((path) => router.register("GET", path, handler));
  wildcardRoutes.forEach((path) => router.register("GET", path, handler));

  const suite = new BenchSuite("RadixRouter 性能测试");

  // 1. 静态路由匹配
  await suite.add(
    { name: "静态路由匹配 (/users)", iterations: 100000 },
    () => {
      router.match("GET", "/users");
    }
  );

  await suite.add(
    { name: "静态路由匹配 (深层 /api/v1/health)", iterations: 100000 },
    () => {
      router.match("GET", "/api/v1/health");
    }
  );

  // 2. 动态参数匹配
  await suite.add(
    { name: "动态参数匹配 (/users/:id)", iterations: 100000 },
    () => {
      router.match("GET", "/users/12345");
    }
  );

  await suite.add(
    { name: "多参数匹配 (/posts/:postId/comments/:commentId)", iterations: 100000 },
    () => {
      router.match("GET", "/posts/100/comments/500");
    }
  );

  // 3. 通配符匹配
  await suite.add(
    { name: "通配符匹配 (/files/*)", iterations: 100000 },
    () => {
      router.match("GET", "/files/path/to/deep/file.txt");
    }
  );

  await suite.add(
    { name: "命名通配符 (/static/*filepath)", iterations: 100000 },
    () => {
      router.match("GET", "/static/assets/css/style.css");
    }
  );

  // 4. 404 不匹配
  await suite.add(
    { name: "404 不匹配", iterations: 100000 },
    () => {
      router.match("GET", "/nonexistent/path/here");
    }
  );

  // 5. 方法不匹配 (405)
  await suite.add(
    { name: "方法不匹配 (405)", iterations: 100000 },
    () => {
      router.match("POST", "/users"); // 只注册了 GET
    }
  );

  // 6. 路由注册性能
  await suite.add(
    { name: "路由注册", iterations: 10000 },
    () => {
      const testRouter = new RadixRouter();
      testRouter.register("GET", "/api/v1/users/:id/orders/:orderId", handler);
    }
  );

  suite.print();

  // 额外的缓存效果测试
  console.log("\n" + "=".repeat(50));
  console.log("📊 缓存效果测试");
  console.log("=".repeat(50));

  const cacheRouter = new RadixRouter();
  cacheRouter.register("GET", "/users/:id", handler);

  // 冷缓存
  cacheRouter.clearCache();
  const coldStart = performance.now();
  for (let i = 0; i < 10000; i++) {
    cacheRouter.match("GET", `/users/${i}`);
  }
  const coldEnd = performance.now();
  const coldOps = 10000 / ((coldEnd - coldStart) / 1000);

  // 热缓存 (重复相同路径)
  const hotStart = performance.now();
  for (let i = 0; i < 10000; i++) {
    cacheRouter.match("GET", "/users/123");
  }
  const hotEnd = performance.now();
  const hotOps = 10000 / ((hotEnd - hotStart) / 1000);

  console.log(`\n冷缓存 (不同路径): ${(coldOps / 1000).toFixed(2)}K ops/sec`);
  console.log(`热缓存 (相同路径): ${(hotOps / 1000).toFixed(2)}K ops/sec`);
  console.log(`缓存加速: ${(hotOps / coldOps).toFixed(2)}x`);

  const stats = cacheRouter.getCacheStats();
  console.log(`缓存大小: ${stats.size} / ${stats.maxSize}`);
}

main().catch(console.error);

