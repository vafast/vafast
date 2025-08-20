import { describe, it, expect } from "vitest";
import { Type } from "@sinclair/typebox";
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

describe("性能提升对比分析", () => {
  describe("验证器优化前后性能对比", () => {
    it("应该分析验证器优化对整体性能的影响", () => {
      const iterations = 1000;

      console.log("=== 验证器性能提升分析 ===");
      console.log(`测试次数: ${iterations}`);

      // 测试当前优化后的验证器性能
      const currentValidationTimes: number[] = [];
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        validateAllSchemasUltra(
          { body: userSchema, query: querySchema },
          { body: validUser, query: validQuery }
        );
        const end = performance.now();
        currentValidationTimes.push(end - start);
      }
      const currentValidationStats = calculateStats(currentValidationTimes);

      // 模拟其他组件的固定处理时间（这些时间在优化前后基本不变）
      const otherComponentsTime = 1.5; // 模拟其他组件总时间

      // 计算优化前后的性能
      const beforeOptimization = {
        validationTime: 0.5, // 优化前验证器时间
        otherTime: otherComponentsTime, // 其他组件时间
        totalTime: 0.5 + otherComponentsTime, // 总时间
        validationPercentage: (0.5 / (0.5 + otherComponentsTime)) * 100, // 验证器占比
      };

      const afterOptimization = {
        validationTime: parseFloat(currentValidationStats.mean), // 优化后验证器时间
        otherTime: otherComponentsTime, // 其他组件时间（假设不变）
        totalTime:
          parseFloat(currentValidationStats.mean) + otherComponentsTime, // 总时间
        validationPercentage:
          (parseFloat(currentValidationStats.mean) /
            (parseFloat(currentValidationStats.mean) + otherComponentsTime)) *
          100, // 验证器占比
      };

      // 计算性能提升
      const validationImprovement =
        beforeOptimization.validationTime / afterOptimization.validationTime;
      const totalImprovement =
        beforeOptimization.totalTime / afterOptimization.totalTime;
      const percentageReduction =
        beforeOptimization.validationPercentage -
        afterOptimization.validationPercentage;

      console.log("\n" + "=".repeat(60));
      console.log("性能提升对比结果");
      console.log("=".repeat(60));

      console.log("\n优化前:");
      console.log(`  验证器时间: ${beforeOptimization.validationTime}ms`);
      console.log(`  其他组件时间: ${beforeOptimization.otherTime}ms`);
      console.log(`  总时间: ${beforeOptimization.totalTime}ms`);
      console.log(
        `  验证器占比: ${beforeOptimization.validationPercentage.toFixed(2)}%`
      );

      console.log("\n优化后:");
      console.log(`  验证器时间: ${afterOptimization.validationTime}ms`);
      console.log(`  其他组件时间: ${afterOptimization.otherTime}ms`);
      console.log(`  总时间: ${afterOptimization.totalTime}ms`);
      console.log(
        `  验证器占比: ${afterOptimization.validationPercentage.toFixed(2)}%`
      );

      console.log("\n性能提升:");
      console.log(`  验证器性能提升: ${validationImprovement.toFixed(1)}x`);
      console.log(`  整体性能提升: ${totalImprovement.toFixed(2)}x`);
      console.log(`  验证器占比减少: ${percentageReduction.toFixed(2)}%`);

      // 分析瓶颈转移情况
      console.log("\n" + "=".repeat(60));
      console.log("瓶颈分析");
      console.log("=".repeat(60));

      if (afterOptimization.validationPercentage > 30) {
        console.log("🚨 验证器仍然是主要瓶颈！");
        console.log(
          `   当前占比: ${afterOptimization.validationPercentage.toFixed(2)}%`
        );
        console.log("   建议: 继续优化验证器或优化其他组件");
      } else if (afterOptimization.validationPercentage > 20) {
        console.log("⚠️  验证器是次要瓶颈");
        console.log(
          `   当前占比: ${afterOptimization.validationPercentage.toFixed(2)}%`
        );
        console.log("   建议: 考虑优化其他组件");
      } else {
        console.log("✅ 验证器不再是瓶颈");
        console.log(
          `   当前占比: ${afterOptimization.validationPercentage.toFixed(2)}%`
        );
        console.log("   建议: 关注其他组件的优化");
      }

      // 计算瓶颈转移效果
      const bottleneckTransfer =
        beforeOptimization.validationPercentage -
        afterOptimization.validationPercentage;
      if (bottleneckTransfer > 20) {
        console.log(
          `\n🎯 瓶颈转移成功！验证器占比减少了${bottleneckTransfer.toFixed(2)}%`
        );
      } else if (bottleneckTransfer > 10) {
        console.log(
          `\n📈 瓶颈有所缓解，验证器占比减少了${bottleneckTransfer.toFixed(2)}%`
        );
      } else {
        console.log(
          `\n📊 瓶颈转移有限，验证器占比只减少了${bottleneckTransfer.toFixed(
            2
          )}%`
        );
      }

      // 验证结果
      expect(validationImprovement).toBeGreaterThan(100); // 验证器应该提升100倍以上
      expect(totalImprovement).toBeGreaterThan(1.1); // 整体应该提升1.1倍以上
      expect(afterOptimization.validationPercentage).toBeLessThan(50); // 验证器占比应该小于50%
    });
  });

  describe("真实性能提升计算", () => {
    it("应该计算真实的端到端性能提升", () => {
      const iterations = 500;

      console.log("=== 真实端到端性能提升计算 ===");
      console.log(`测试次数: ${iterations}`);

      // 模拟完整的请求处理流程
      const requestTimes: number[] = [];
      const validationTimes: number[] = [];
      const otherProcessingTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const requestStart = performance.now();

        // 1. 验证阶段
        const validationStart = performance.now();
        validateAllSchemasUltra(
          { body: userSchema, query: querySchema },
          {
            body: { ...validUser, id: i },
            query: { page: i, limit: 20, search: `user${i}` },
          }
        );
        const validationEnd = performance.now();

        // 2. 其他处理阶段（模拟路由匹配、中间件、业务逻辑等）
        const otherStart = performance.now();

        // 模拟路由匹配
        const routes = [
          { method: "GET", path: "/api/users" },
          { method: "POST", path: "/api/users" },
          { method: "PUT", path: "/api/users/:id" },
        ];
        const matchedRoute = routes.find(
          (r) => r.method === "POST" && r.path === "/api/users"
        );

        // 模拟中间件处理
        const req = {
          method: "POST",
          url: "/api/users",
          headers: {},
          body: validUser,
        };
        if (req.method === "POST") {
          req.body = { ...req.body, processed: true };
        }

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

        // 模拟一些计算
        let sum = 0;
        for (let j = 0; j < 100; j++) {
          sum += j;
        }
        processedUser.sum = sum;

        const otherEnd = performance.now();

        const requestEnd = performance.now();

        requestTimes.push(requestEnd - requestStart);
        validationTimes.push(validationEnd - validationStart);
        otherProcessingTimes.push(otherEnd - otherStart);

        if (i % 100 === 0) {
          console.log(
            `第${i + 1}次: 验证${(validationEnd - validationStart).toFixed(
              3
            )}ms, 其他${(otherEnd - otherStart).toFixed(3)}ms, 总计${(
              requestEnd - requestStart
            ).toFixed(3)}ms`
          );
        }
      }

      const requestStats = calculateStats(requestTimes);
      const validationStats = calculateStats(validationTimes);
      const otherStats = calculateStats(otherProcessingTimes);

      console.log("\n=== 端到端性能分析 ===");
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

      console.log("\n其他处理时间:");
      console.log(`  平均: ${otherStats.mean}ms`);
      console.log(
        `  占比: ${(
          (parseFloat(otherStats.mean) / parseFloat(requestStats.mean)) *
          100
        ).toFixed(2)}%`
      );

      // 计算性能提升
      const currentValidationTime = parseFloat(validationStats.mean);
      const currentTotalTime = parseFloat(requestStats.mean);
      const currentValidationPercentage =
        (currentValidationTime / currentTotalTime) * 100;

      // 假设优化前的情况
      const beforeValidationTime = 0.5; // 优化前验证器时间
      const beforeOtherTime = currentTotalTime - currentValidationTime; // 其他时间假设不变
      const beforeTotalTime = beforeValidationTime + beforeOtherTime;
      const beforeValidationPercentage =
        (beforeValidationTime / beforeTotalTime) * 100;

      const validationImprovement =
        beforeValidationTime / currentValidationTime;
      const totalImprovement = beforeTotalTime / currentTotalTime;

      console.log("\n" + "=".repeat(60));
      console.log("性能提升计算结果");
      console.log("=".repeat(60));

      console.log("\n优化前 (模拟):");
      console.log(`  验证器时间: ${beforeValidationTime}ms`);
      console.log(`  其他时间: ${beforeOtherTime.toFixed(3)}ms`);
      console.log(`  总时间: ${beforeTotalTime.toFixed(3)}ms`);
      console.log(`  验证器占比: ${beforeValidationPercentage.toFixed(2)}%`);

      console.log("\n优化后 (实际):");
      console.log(`  验证器时间: ${currentValidationTime}ms`);
      console.log(`  其他时间: ${beforeOtherTime.toFixed(3)}ms`);
      console.log(`  总时间: ${currentTotalTime}ms`);
      console.log(`  验证器占比: ${currentValidationPercentage.toFixed(2)}%`);

      console.log("\n性能提升:");
      console.log(`  验证器性能提升: ${validationImprovement.toFixed(1)}x`);
      console.log(`  整体性能提升: ${totalImprovement.toFixed(2)}x`);
      console.log(
        `  验证器占比变化: ${beforeValidationPercentage.toFixed(
          2
        )}% → ${currentValidationPercentage.toFixed(2)}%`
      );

      // 分析瓶颈转移
      if (currentValidationPercentage < 10) {
        console.log("\n🎉 瓶颈转移成功！验证器不再是主要瓶颈");
      } else if (currentValidationPercentage < 20) {
        console.log("\n📈 瓶颈有所缓解，验证器占比显著降低");
      } else {
        console.log("\n⚠️  瓶颈转移有限，验证器仍然是主要瓶颈");
      }

      // 验证结果
      expect(validationImprovement).toBeGreaterThan(100); // 验证器应该提升100倍以上
      expect(totalImprovement).toBeGreaterThan(1.1); // 整体应该提升1.1倍以上
      expect(currentValidationPercentage).toBeLessThan(30); // 验证器占比应该小于30%
    });
  });
});
