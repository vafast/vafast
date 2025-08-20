import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Type } from "@sinclair/typebox";
import { Server } from "../../src/server";
import type { Route } from "../../src/types";

// 测试用的Schema定义
const userSchema = Type.Object({
  id: Type.Number(),
  name: Type.String(),
  email: Type.String(),
  age: Type.Number({ minimum: 0, maximum: 150 }),
  isActive: Type.Boolean(),
});

const querySchema = Type.Object({
  page: Type.Number({ minimum: 1 }),
  limit: Type.Number({ minimum: 1, maximum: 100 }),
  search: Type.Optional(Type.String()),
});

// 测试数据
const validUser = {
  id: 1,
  name: "张三",
  email: "zhangsan@example.com",
  age: 25,
  isActive: true,
};

const validQuery = {
  page: 1,
  limit: 20,
  search: "测试",
};

// 统计函数
function calculateStats(times: number[]) {
  const sum = times.reduce((a, b) => a + b, 0);
  const mean = sum / times.length;
  const variance =
    times.reduce((acc, time) => acc + Math.pow(time - mean, 2), 0) /
    times.length;
  const stdDev = Math.sqrt(variance);
  const min = Math.min(...times);
  const max = Math.max(...times);

  return {
    mean: mean.toFixed(2),
    stdDev: stdDev.toFixed(2),
    min: min.toFixed(2),
    max: max.toFixed(2),
    count: times.length,
    total: sum.toFixed(2),
  };
}

describe("端到端性能测试", () => {
  let server: Server;

  beforeEach(() => {
    // 创建测试应用
    const routes: Route[] = [
      {
        method: "POST",
        path: "/api/users",
        handler: async (req) => {
          // 这里我们手动进行验证，模拟验证器的性能
          const body = req.body;
          // 从URL中解析query参数
          const url = new URL(req.url);
          const query = Object.fromEntries(url.searchParams.entries());

          // 模拟验证过程
          if (!body || Object.keys(query).length === 0) {
            return new Response(
              JSON.stringify({ error: "Missing body or query" }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              }
            );
          }

          return new Response(
            JSON.stringify({
              success: true,
              data: body,
              query: query,
              message: "用户创建成功",
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );
        },
      },
    ];

    server = new Server(routes);
  });

  afterEach(() => {
    // 清理
  });

  describe("完整API调用性能测试", () => {
    it("应该测试完整API调用流程的性能", async () => {
      const iterations = 1000;
      const times: number[] = [];

      console.log("=== 完整API调用性能测试 ===");
      console.log(`测试次数: ${iterations}`);

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();

        // 模拟完整的HTTP请求
        const request = new Request(
          "http://localhost/api/users?page=1&limit=20&search=test",
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              authorization: "Bearer test-token",
            },
            body: JSON.stringify(validUser),
          }
        );

        const response = await server.fetch(request);
        const end = performance.now();
        const time = end - start;
        times.push(time);

        // 验证响应
        expect(response.status).toBe(200);

        if (i % 100 === 0) {
          console.log(`第${i + 1}次调用: ${time.toFixed(2)}ms`);
        }
      }

      const stats = calculateStats(times);

      console.log("\n=== 性能统计结果 ===");
      console.log(`平均响应时间: ${stats.mean}ms`);
      console.log(`标准差: ${stats.stdDev}ms`);
      console.log(`最小响应时间: ${stats.min}ms`);
      console.log(`最大响应时间: ${stats.max}ms`);
      console.log(`总测试时间: ${stats.total}ms`);
      console.log(
        `平均吞吐量: ${(1000 / parseFloat(stats.mean)).toFixed(0)} 请求/秒`
      );

      // 期望响应时间在合理范围内
      expect(parseFloat(stats.mean)).toBeLessThan(10); // 期望平均响应时间小于10ms
    });
  });

  describe("性能瓶颈分析测试", () => {
    it("应该分析各个组件的性能贡献", async () => {
      const iterations = 100;
      const routeMatchTimes: number[] = [];
      const totalTimes: number[] = [];

      console.log("=== 性能瓶颈分析测试 ===");
      console.log(`测试次数: ${iterations}`);

      for (let i = 0; i < iterations; i++) {
        // 测试路由匹配性能
        const routeStart = performance.now();
        // 使用类型断言访问私有属性，仅用于测试
        const route = (server as any).routes?.find(
          (r: any) => r.method === "POST" && r.path === "/api/users"
        );
        const routeEnd = performance.now();
        routeMatchTimes.push(routeEnd - routeStart);

        // 测试完整流程
        const totalStart = performance.now();
        const request = new Request(
          "http://localhost/api/users?page=1&limit=20&search=test",
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(validUser),
          }
        );

        await server.fetch(request);
        const totalEnd = performance.now();
        totalTimes.push(totalEnd - totalStart);

        if (i % 20 === 0) {
          console.log(`第${i + 1}次测试完成`);
        }
      }

      const routeStats = calculateStats(routeMatchTimes);
      const totalStats = calculateStats(totalTimes);

      console.log("\n=== 性能瓶颈分析结果 ===");
      console.log("路由匹配:");
      console.log(`  平均时间: ${routeStats.mean}ms`);
      console.log(
        `  占总时间比例: ${(
          (parseFloat(routeStats.mean) / parseFloat(totalStats.mean)) *
          100
        ).toFixed(2)}%`
      );

      console.log("\n完整流程:");
      console.log(`  平均时间: ${totalStats.mean}ms`);
      console.log(`  标准差: ${totalStats.stdDev}ms`);

      // 分析性能瓶颈
      const routePercentage =
        (parseFloat(routeStats.mean) / parseFloat(totalStats.mean)) * 100;

      console.log("\n=== 性能瓶颈分析 ===");
      if (routePercentage > 50) {
        console.log("🚨 主要瓶颈: 路由匹配 (建议优化路由算法)");
      } else {
        console.log("✅ 性能分布均衡，无明显瓶颈");
      }

      expect(parseFloat(totalStats.mean)).toBeLessThan(20); // 期望完整流程小于20ms
    });
  });

  describe("高并发压力测试", () => {
    it("应该进行高并发压力测试", async () => {
      const concurrentUsers = 100;
      const requestsPerUser = 10;
      const totalRequests = concurrentUsers * requestsPerUser;

      console.log("=== 高并发压力测试 ===");
      console.log(`并发用户数: ${concurrentUsers}`);
      console.log(`每用户请求数: ${requestsPerUser}`);
      console.log(`总请求数: ${totalRequests}`);

      const startTime = performance.now();
      const promises: Promise<any>[] = [];

      // 创建并发请求
      for (let user = 0; user < concurrentUsers; user++) {
        for (let req = 0; req < requestsPerUser; req++) {
          const request = new Request(
            `http://localhost/api/users?page=${
              req + 1
            }&limit=20&search=user${user}`,
            {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                ...validUser,
                id: user * 1000 + req,
                name: `用户${user}-${req}`,
              }),
            }
          );

          const promise = server.fetch(request);
          promises.push(promise);
        }
      }

      // 等待所有请求完成
      const responses = await Promise.all(promises);
      const endTime = performance.now();

      const totalTime = endTime - startTime;
      const avgResponseTime = totalTime / totalRequests;
      const throughput = totalRequests / (totalTime / 1000);

      // 验证所有响应
      const successCount = responses.filter((r) => r.status === 200).length;
      const errorCount = totalRequests - successCount;

      console.log("\n=== 压力测试结果 ===");
      console.log(`总测试时间: ${totalTime.toFixed(2)}ms`);
      console.log(`平均响应时间: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`总吞吐量: ${throughput.toFixed(0)} 请求/秒`);
      console.log(`成功请求: ${successCount}`);
      console.log(`失败请求: ${errorCount}`);
      console.log(
        `成功率: ${((successCount / totalRequests) * 100).toFixed(2)}%`
      );

      // 性能期望
      expect(successCount).toBeGreaterThan(totalRequests * 0.95); // 期望95%以上成功率
      expect(avgResponseTime).toBeLessThan(50); // 期望平均响应时间小于50ms
      expect(throughput).toBeGreaterThan(100); // 期望吞吐量大于100请求/秒
    });
  });

  describe("内存使用分析", () => {
    it("应该分析内存使用情况", async () => {
      const iterations = 1000;

      // 记录初始内存使用
      const initialMemory = process.memoryUsage();

      console.log("=== 内存使用分析测试 ===");
      console.log(`测试次数: ${iterations}`);
      console.log("初始内存使用:");
      console.log(`  RSS: ${(initialMemory.rss / 1024 / 1024).toFixed(2)} MB`);
      console.log(
        `  Heap Used: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`
      );
      console.log(
        `  Heap Total: ${(initialMemory.heapTotal / 1024 / 1024).toFixed(2)} MB`
      );

      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();

        const request = new Request(
          "http://localhost/api/users?page=1&limit=20&search=test",
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(validUser),
          }
        );

        await server.fetch(request);

        const end = performance.now();
        times.push(end - start);

        // 每100次检查一次内存
        if (i % 100 === 0) {
          const currentMemory = process.memoryUsage();
          const rssDiff = currentMemory.rss - initialMemory.rss;
          const heapDiff = currentMemory.heapUsed - initialMemory.heapUsed;

          console.log(
            `第${i + 1}次: RSS变化 ${(rssDiff / 1024 / 1024).toFixed(
              2
            )} MB, Heap变化 ${(heapDiff / 1024 / 1024).toFixed(2)} MB`
          );
        }
      }

      // 记录最终内存使用
      const finalMemory = process.memoryUsage();
      const stats = calculateStats(times);

      console.log("\n=== 内存使用分析结果 ===");
      console.log("最终内存使用:");
      console.log(`  RSS: ${(finalMemory.rss / 1024 / 1024).toFixed(2)} MB`);
      console.log(
        `  Heap Used: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`
      );
      console.log(
        `  Heap Total: ${(finalMemory.heapTotal / 1024 / 1024).toFixed(2)} MB`
      );

      console.log("\n内存变化:");
      console.log(
        `  RSS变化: ${(
          (finalMemory.rss - initialMemory.rss) /
          1024 /
          1024
        ).toFixed(2)} MB`
      );
      console.log(
        `  Heap变化: ${(
          (finalMemory.heapUsed - initialMemory.heapUsed) /
          1024 /
          1024
        ).toFixed(2)} MB`
      );

      console.log("\n性能统计:");
      console.log(`平均响应时间: ${stats.mean}ms`);
      console.log(`总测试时间: ${stats.total}ms`);

      // 检查内存泄漏
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = memoryIncrease / 1024 / 1024;

      if (memoryIncreaseMB > 10) {
        console.log("⚠️  警告: 可能存在内存泄漏，Heap增长超过10MB");
      } else {
        console.log("✅ 内存使用正常，无明显泄漏");
      }

      expect(memoryIncreaseMB).toBeLessThan(50); // 期望内存增长小于50MB
    });
  });
});
