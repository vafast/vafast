import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Type } from "@sinclair/typebox";
import { Server } from "../../src/server";
import type { Route } from "../../src/types";
import { validateAllSchemasUltra } from "../../src/utils/validators/schema-validators-ultra";

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
    mean: mean.toFixed(3),
    stdDev: stdDev.toFixed(3),
    min: min.toFixed(3),
    max: max.toFixed(3),
    count: times.length,
    total: sum.toFixed(3),
  };
}

describe("性能瓶颈深度分析", () => {
  describe("各组件性能分解测试", () => {
    it("应该分析各个组件的具体性能贡献", () => {
      const iterations = 1000;

      // 1. 验证器性能测试
      console.log("=== 验证器性能测试 ===");
      const validationTimes: number[] = [];
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        validateAllSchemasUltra(
          { body: userSchema, query: querySchema },
          { body: validUser, query: validQuery }
        );
        const end = performance.now();
        validationTimes.push(end - start);
      }
      const validationStats = calculateStats(validationTimes);

      // 2. JSON解析性能测试
      console.log("=== JSON解析性能测试 ===");
      const jsonParseTimes: number[] = [];
      const jsonStringifyTimes: number[] = [];
      for (let i = 0; i < iterations; i++) {
        // JSON解析
        const parseStart = performance.now();
        JSON.parse(JSON.stringify(validUser));
        const parseEnd = performance.now();
        jsonParseTimes.push(parseEnd - parseStart);

        // JSON序列化
        const stringifyStart = performance.now();
        JSON.stringify(validUser);
        const stringifyEnd = performance.now();
        jsonStringifyTimes.push(stringifyEnd - stringifyStart);
      }
      const jsonParseStats = calculateStats(jsonParseTimes);
      const jsonStringifyStats = calculateStats(jsonStringifyTimes);

      // 3. 字符串操作性能测试
      console.log("=== 字符串操作性能测试 ===");
      const stringOpTimes: number[] = [];
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        const url = `/api/users?page=${i}&limit=20&search=test${i}`;
        const pathname = url.split("?")[0];
        const queryString = url.split("?")[1];
        const end = performance.now();
        stringOpTimes.push(end - start);
      }
      const stringOpStats = calculateStats(stringOpTimes);

      // 4. 对象操作性能测试
      console.log("=== 对象操作性能测试 ===");
      const objectOpTimes: number[] = [];
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        const obj = { ...validUser, id: i };
        const keys = Object.keys(obj);
        const values = Object.values(obj);
        const end = performance.now();
        objectOpTimes.push(end - start);
      }
      const objectOpStats = calculateStats(objectOpTimes);

      // 5. 模拟路由匹配性能测试
      console.log("=== 路由匹配性能测试 ===");
      const routeMatchTimes: number[] = [];
      const routes = [
        { method: "GET", path: "/api/users" },
        { method: "POST", path: "/api/users" },
        { method: "PUT", path: "/api/users/:id" },
        { method: "DELETE", path: "/api/users/:id" },
      ];
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        const method = "POST";
        const path = "/api/users";
        const matchedRoute = routes.find(
          (r) => r.method === method && r.path === path
        );
        const end = performance.now();
        routeMatchTimes.push(end - start);
      }
      const routeMatchStats = calculateStats(routeMatchTimes);

      // 6. 模拟中间件性能测试
      console.log("=== 中间件性能测试 ===");
      const middlewareTimes: number[] = [];
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        // 模拟中间件处理
        const req = {
          method: "POST",
          url: "/api/users",
          headers: {},
          body: validUser,
        };
        const res = { status: 200, body: { success: true } };
        // 模拟一些中间件逻辑
        if (req.method === "POST") {
          req.body = { ...req.body, processed: true };
        }
        const end = performance.now();
        middlewareTimes.push(end - start);
      }
      const middlewareStats = calculateStats(middlewareTimes);

      // 7. 模拟业务逻辑性能测试
      console.log("=== 业务逻辑性能测试 ===");
      const businessLogicTimes: number[] = [];
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        // 模拟业务逻辑
        const user = { ...validUser, id: i };
        const processedUser = {
          ...user,
          createdAt: new Date(),
          updatedAt: new Date(),
          status: "active",
          permissions: ["read", "write"],
          metadata: {
            lastLogin: new Date(),
            loginCount: i,
            preferences: { theme: "dark", language: "zh-CN" },
          },
        };
        const end = performance.now();
        businessLogicTimes.push(end - start);
      }
      const businessLogicStats = calculateStats(businessLogicTimes);

      // 输出详细分析结果
      console.log("\n" + "=".repeat(60));
      console.log("详细性能分析结果");
      console.log("=".repeat(60));

      console.log("\n1. 验证器性能:");
      console.log(`   平均时间: ${validationStats.mean}ms`);
      console.log(`   标准差: ${validationStats.stdDev}ms`);
      console.log(`   总时间: ${validationStats.total}ms`);

      console.log("\n2. JSON解析性能:");
      console.log(`   解析平均时间: ${jsonParseStats.mean}ms`);
      console.log(`   序列化平均时间: ${jsonStringifyStats.mean}ms`);
      console.log(
        `   JSON总时间: ${(
          parseFloat(jsonParseStats.total) +
          parseFloat(jsonStringifyStats.total)
        ).toFixed(3)}ms`
      );

      console.log("\n3. 字符串操作性能:");
      console.log(`   平均时间: ${stringOpStats.mean}ms`);
      console.log(`   总时间: ${stringOpStats.total}ms`);

      console.log("\n4. 对象操作性能:");
      console.log(`   平均时间: ${objectOpStats.mean}ms`);
      console.log(`   总时间: ${objectOpStats.total}ms`);

      console.log("\n5. 路由匹配性能:");
      console.log(`   平均时间: ${routeMatchStats.mean}ms`);
      console.log(`   总时间: ${routeMatchStats.total}ms`);

      console.log("\n6. 中间件性能:");
      console.log(`   平均时间: ${middlewareStats.mean}ms`);
      console.log(`   总时间: ${middlewareStats.total}ms`);

      console.log("\n7. 业务逻辑性能:");
      console.log(`   平均时间: ${businessLogicStats.mean}ms`);
      console.log(`   总时间: ${businessLogicStats.total}ms`);

      // 计算总时间和各组件占比
      const totalTime =
        parseFloat(validationStats.total) +
        parseFloat(jsonParseStats.total) +
        parseFloat(jsonStringifyStats.total) +
        parseFloat(stringOpStats.total) +
        parseFloat(objectOpStats.total) +
        parseFloat(routeMatchStats.total) +
        parseFloat(middlewareStats.total) +
        parseFloat(businessLogicStats.total);

      console.log("\n" + "=".repeat(60));
      console.log("性能瓶颈分析");
      console.log("=".repeat(60));

      console.log(`总模拟时间: ${totalTime.toFixed(3)}ms`);
      console.log(
        `验证器占比: ${(
          (parseFloat(validationStats.total) / totalTime) *
          100
        ).toFixed(2)}%`
      );
      console.log(
        `JSON处理占比: ${(
          ((parseFloat(jsonParseStats.total) +
            parseFloat(jsonStringifyStats.total)) /
            totalTime) *
          100
        ).toFixed(2)}%`
      );
      console.log(
        `字符串操作占比: ${(
          (parseFloat(stringOpStats.total) / totalTime) *
          100
        ).toFixed(2)}%`
      );
      console.log(
        `对象操作占比: ${(
          (parseFloat(objectOpStats.total) / totalTime) *
          100
        ).toFixed(2)}%`
      );
      console.log(
        `路由匹配占比: ${(
          (parseFloat(routeMatchStats.total) / totalTime) *
          100
        ).toFixed(2)}%`
      );
      console.log(
        `中间件占比: ${(
          (parseFloat(middlewareStats.total) / totalTime) *
          100
        ).toFixed(2)}%`
      );
      console.log(
        `业务逻辑占比: ${(
          (parseFloat(businessLogicStats.total) / totalTime) *
          100
        ).toFixed(2)}%`
      );

      // 找出主要瓶颈
      const components = [
        { name: "验证器", time: parseFloat(validationStats.total) },
        {
          name: "JSON处理",
          time:
            parseFloat(jsonParseStats.total) +
            parseFloat(jsonStringifyStats.total),
        },
        { name: "字符串操作", time: parseFloat(stringOpStats.total) },
        { name: "对象操作", time: parseFloat(objectOpStats.total) },
        { name: "路由匹配", time: parseFloat(routeMatchStats.total) },
        { name: "中间件", time: parseFloat(middlewareStats.total) },
        { name: "业务逻辑", time: parseFloat(businessLogicStats.total) },
      ];

      components.sort((a, b) => b.time - a.time);

      console.log("\n瓶颈排序 (从大到小):");
      components.forEach((comp, index) => {
        const percentage = ((comp.time / totalTime) * 100).toFixed(2);
        console.log(
          `${index + 1}. ${comp.name}: ${comp.time.toFixed(
            3
          )}ms (${percentage}%)`
        );
      });

      // 验证结果
      expect(parseFloat(validationStats.mean)).toBeLessThan(0.1); // 验证器应该很快
      expect(parseFloat(validationStats.total)).toBeLessThan(totalTime * 0.1); // 验证器不应该占用过多时间
    });
  });

  describe("真实瓶颈场景测试", () => {
    it("应该测试真实场景下的性能瓶颈", () => {
      const iterations = 100;

      console.log("=== 真实瓶颈场景测试 ===");
      console.log(`测试次数: ${iterations}`);

      // 模拟一个完整的请求处理流程
      const requestTimes: number[] = [];
      const validationTimes: number[] = [];
      const processingTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const requestStart = performance.now();

        // 1. 请求解析阶段
        const parseStart = performance.now();
        const url = `/api/users?page=${i}&limit=20&search=user${i}`;
        const method = "POST";
        const headers = { "content-type": "application/json" };
        const body = JSON.stringify({ ...validUser, id: i });
        const parseEnd = performance.now();

        // 2. 验证阶段
        const validationStart = performance.now();
        validateAllSchemasUltra(
          { body: userSchema, query: querySchema },
          {
            body: { ...validUser, id: i },
            query: { page: i, limit: 20, search: `user${i}` },
          }
        );
        const validationEnd = performance.now();

        // 3. 业务处理阶段
        const processingStart = performance.now();
        // 模拟复杂的业务逻辑
        const user = { ...validUser, id: i };
        const processedUser = {
          ...user,
          createdAt: new Date(),
          updatedAt: new Date(),
          status: "active",
          permissions: ["read", "write", "delete"],
          metadata: {
            lastLogin: new Date(),
            loginCount: i,
            preferences: {
              theme: "dark",
              language: "zh-CN",
              notifications: true,
              timezone: "Asia/Shanghai",
            },
            security: {
              twoFactorEnabled: i % 2 === 0,
              lastPasswordChange: new Date(),
              failedLoginAttempts: 0,
            },
          },
          relationships: {
            friends: Array.from({ length: i % 10 }, (_, j) => ({
              id: j,
              name: `Friend${j}`,
            })),
            groups: Array.from({ length: i % 5 }, (_, j) => ({
              id: j,
              name: `Group${j}`,
            })),
          },
        };

        // 模拟一些计算密集型操作
        let hash = 0;
        for (let j = 0; j < 1000; j++) {
          hash = ((hash << 5) - hash + j) & 0xffffffff;
        }
        processedUser.hash = hash;

        const processingEnd = performance.now();

        const requestEnd = performance.now();

        requestTimes.push(requestEnd - requestStart);
        validationTimes.push(validationEnd - validationStart);
        processingTimes.push(processingEnd - processingStart);

        if (i % 20 === 0) {
          console.log(
            `第${i + 1}次: 解析${(parseEnd - parseStart).toFixed(3)}ms, 验证${(
              validationEnd - validationStart
            ).toFixed(3)}ms, 处理${(processingEnd - processingStart).toFixed(
              3
            )}ms, 总计${(requestEnd - requestStart).toFixed(3)}ms`
          );
        }
      }

      const requestStats = calculateStats(requestTimes);
      const validationStats = calculateStats(validationTimes);
      const processingStats = calculateStats(processingTimes);

      console.log("\n=== 真实场景性能分析 ===");
      console.log("总请求时间:");
      console.log(`  平均: ${requestStats.mean}ms`);
      console.log(`  标准差: ${requestStats.stdDev}ms`);

      console.log("\n验证器时间:");
      console.log(`  平均: ${validationStats.mean}ms`);
      console.log(
        `  占比: ${(
          (parseFloat(validationStats.mean) / parseFloat(requestStats.mean)) *
          100
        ).toFixed(2)}%`
      );

      console.log("\n业务处理时间:");
      console.log(`  平均: ${processingStats.mean}ms`);
      console.log(
        `  占比: ${(
          (parseFloat(processingStats.mean) / parseFloat(requestStats.mean)) *
          100
        ).toFixed(2)}%`
      );

      // 分析瓶颈
      const validationPercentage =
        (parseFloat(validationStats.mean) / parseFloat(requestStats.mean)) *
        100;
      const processingPercentage =
        (parseFloat(processingStats.mean) / parseFloat(requestStats.mean)) *
        100;

      console.log("\n=== 瓶颈分析结果 ===");
      if (validationPercentage > 30) {
        console.log("🚨 验证器是主要瓶颈！");
      } else if (processingPercentage > 50) {
        console.log("🚨 业务处理是主要瓶颈！");
      } else {
        console.log("✅ 性能分布相对均衡");
      }

      console.log(`\n💡 优化建议:`);
      if (validationPercentage > 20) {
        console.log("  - 进一步优化验证器性能");
      }
      if (processingPercentage > 40) {
        console.log("  - 优化业务逻辑，减少不必要的计算");
        console.log("  - 考虑异步处理和缓存");
        console.log("  - 优化数据结构");
      }

      // 验证结果
      expect(validationPercentage).toBeLessThan(20); // 验证器占比应该小于20%
      expect(parseFloat(validationStats.mean)).toBeLessThan(0.1); // 验证器应该很快
    });
  });
});
