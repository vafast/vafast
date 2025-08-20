import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Type } from "@sinclair/typebox";
import {
  validateSchemaConfig,
  type SchemaConfig,
  type RequestData,
} from "../../src/utils/validators/schema-validator";
import {
  validateAllSchemasUltra,
  clearUltraCache,
} from "../../src/utils/validators/schema-validators-ultra";

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

const paramsSchema = Type.Object({
  userId: Type.String(),
});

const headersSchema = Type.Object({
  authorization: Type.String(),
  "content-type": Type.String(),
});

const cookiesSchema = Type.Object({
  sessionId: Type.String(),
  theme: Type.Optional(Type.String()),
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

const validParams = {
  userId: "507f1f77bcf86cd799439011",
};

const validHeaders = {
  authorization: "Bearer token123",
  "content-type": "application/json",
};

const validCookies = {
  sessionId: "sess_123456",
  theme: "light",
};

// 统计函数
function calculateStats(times: number[]) {
  const sum = times.reduce((a, b) => a + b, 0);
  const mean = sum / times.length;
  const variance = times.reduce((acc, time) => acc + Math.pow(time - mean, 2), 0) / times.length;
  const stdDev = Math.sqrt(variance);
  const min = Math.min(...times);
  const max = Math.max(...times);
  
  return {
    mean: mean.toFixed(2),
    stdDev: stdDev.toFixed(2),
    min: min.toFixed(2),
    max: max.toFixed(2),
    count: times.length,
    total: sum.toFixed(2)
  };
}

describe("验证器性能多次测试", () => {
  beforeEach(() => {
    clearUltraCache();
  });

  afterEach(() => {
    clearUltraCache();
  });

  describe("单次验证性能 - 多次测试", () => {
    it("应该进行10轮单次验证性能测试", () => {
      const iterations = 1000;
      const rounds = 10;
      const originalTimes: number[] = [];
      const optimizedTimes: number[] = [];
      
      console.log("=== 单次验证性能 - 10轮测试 ===");
      
      for (let round = 1; round <= rounds; round++) {
        // 测试原来的验证器
        clearUltraCache();
        const start1 = performance.now();
        for (let i = 0; i < iterations; i++) {
          const config: SchemaConfig = { body: userSchema };
          const data: RequestData = { body: validUser };
          validateSchemaConfig(config, data);
        }
        const end1 = performance.now();
        const originalTime = end1 - start1;
        originalTimes.push(originalTime);
        
        // 测试优化后的验证器
        clearUltraCache();
        const start2 = performance.now();
        for (let i = 0; i < iterations; i++) {
          validateAllSchemasUltra({ body: userSchema }, { body: validUser });
        }
        const end2 = performance.now();
        const optimizedTime = end2 - start2;
        optimizedTimes.push(optimizedTime);
        
        console.log(`第${round}轮: 原来${originalTime.toFixed(2)}ms, 优化${optimizedTime.toFixed(2)}ms, 提升${(originalTime / optimizedTime).toFixed(2)}x`);
      }
      
      const originalStats = calculateStats(originalTimes);
      const optimizedStats = calculateStats(optimizedTimes);
      const avgImprovement = originalTimes.reduce((sum, time, i) => sum + (time / optimizedTimes[i]), 0) / rounds;
      
      console.log("\n=== 统计结果 ===");
      console.log("原来验证器:");
      console.log(`  平均值: ${originalStats.mean}ms`);
      console.log(`  标准差: ${originalStats.stdDev}ms`);
      console.log(`  最小值: ${originalStats.min}ms`);
      console.log(`  最大值: ${originalStats.max}ms`);
      console.log(`  总时间: ${originalStats.total}ms`);
      
      console.log("\n优化验证器:");
      console.log(`  平均值: ${optimizedStats.mean}ms`);
      console.log(`  标准差: ${optimizedStats.stdDev}ms`);
      console.log(`  最小值: ${optimizedStats.min}ms`);
      console.log(`  最大值: ${optimizedStats.max}ms`);
      console.log(`  总时间: ${optimizedStats.total}ms`);
      
      console.log(`\n平均性能提升: ${avgImprovement.toFixed(2)}x`);
      
      // 验证优化后的验证器确实更快
      expect(parseFloat(optimizedStats.mean)).toBeLessThan(parseFloat(originalStats.mean));
    });
  });

  describe("批量验证性能 - 多次测试", () => {
    it("应该进行10轮批量验证性能测试", () => {
      const config: SchemaConfig = {
        body: userSchema,
        query: querySchema,
        params: paramsSchema,
        headers: headersSchema,
        cookies: cookiesSchema,
      };

      const data: RequestData = {
        body: validUser,
        query: validQuery,
        params: validParams,
        headers: validHeaders,
        cookies: validCookies,
      };

      const iterations = 1000;
      const rounds = 10;
      const originalTimes: number[] = [];
      const optimizedTimes: number[] = [];
      
      console.log("=== 批量验证性能 - 10轮测试 ===");
      
      for (let round = 1; round <= rounds; round++) {
        // 测试原来的验证器
        clearUltraCache();
        const start1 = performance.now();
        for (let i = 0; i < iterations; i++) {
          validateSchemaConfig(config, data);
        }
        const end1 = performance.now();
        const originalTime = end1 - start1;
        originalTimes.push(originalTime);
        
        // 测试优化后的验证器
        clearUltraCache();
        const start2 = performance.now();
        for (let i = 0; i < iterations; i++) {
          validateAllSchemasUltra(config, {
            body: validUser,
            query: validQuery,
            params: validParams,
            headers: validHeaders,
            cookies: validCookies,
          });
        }
        const end2 = performance.now();
        const optimizedTime = end2 - start2;
        optimizedTimes.push(optimizedTime);
        
        console.log(`第${round}轮: 原来${originalTime.toFixed(2)}ms, 优化${optimizedTime.toFixed(2)}ms, 提升${(originalTime / optimizedTime).toFixed(2)}x`);
      }
      
      const originalStats = calculateStats(originalTimes);
      const optimizedStats = calculateStats(optimizedTimes);
      const avgImprovement = originalTimes.reduce((sum, time, i) => sum + (time / optimizedTimes[i]), 0) / rounds;
      
      console.log("\n=== 统计结果 ===");
      console.log("原来验证器:");
      console.log(`  平均值: ${originalStats.mean}ms`);
      console.log(`  标准差: ${originalStats.stdDev}ms`);
      console.log(`  最小值: ${originalStats.min}ms`);
      console.log(`  最大值: ${originalStats.max}ms`);
      
      console.log("\n优化验证器:");
      console.log(`  平均值: ${optimizedStats.mean}ms`);
      console.log(`  标准差: ${optimizedStats.stdDev}ms`);
      console.log(`  最小值: ${optimizedStats.min}ms`);
      console.log(`  最大值: ${optimizedStats.max}ms`);
      
      console.log(`\n平均性能提升: ${avgImprovement.toFixed(2)}x`);
      
      expect(parseFloat(optimizedStats.mean)).toBeLessThan(parseFloat(originalStats.mean));
    });
  });

  describe("缓存效果 - 多次测试", () => {
    it("应该进行10轮缓存效果测试", () => {
      const config: SchemaConfig = { body: userSchema };
      const data: RequestData = { body: validUser };
      const iterations = 1000;
      const rounds = 10;
      const originalTimes: number[] = [];
      const optimizedTimes: number[] = [];
      
      console.log("=== 缓存效果 - 10轮测试 ===");
      
      for (let round = 1; round <= rounds; round++) {
        // 测试原来的验证器（无缓存）
        const start1 = performance.now();
        for (let i = 0; i < iterations; i++) {
          validateSchemaConfig(config, data);
        }
        const end1 = performance.now();
        const originalTime = end1 - start1;
        originalTimes.push(originalTime);
        
        // 测试优化后的验证器（有缓存）
        clearUltraCache();
        const start2 = performance.now();
        for (let i = 0; i < iterations; i++) {
          validateAllSchemasUltra(config, { body: validUser });
        }
        const end2 = performance.now();
        const optimizedTime = end2 - start2;
        optimizedTimes.push(optimizedTime);
        
        console.log(`第${round}轮: 原来${originalTime.toFixed(2)}ms, 优化${optimizedTime.toFixed(2)}ms, 提升${(originalTime / optimizedTime).toFixed(2)}x`);
      }
      
      const originalStats = calculateStats(originalTimes);
      const optimizedStats = calculateStats(optimizedTimes);
      const avgImprovement = originalTimes.reduce((sum, time, i) => sum + (time / optimizedTimes[i]), 0) / rounds;
      
      console.log("\n=== 统计结果 ===");
      console.log("原来验证器（无缓存）:");
      console.log(`  平均值: ${originalStats.mean}ms`);
      console.log(`  标准差: ${originalStats.stdDev}ms`);
      
      console.log("\n优化验证器（有缓存）:");
      console.log(`  平均值: ${optimizedStats.mean}ms`);
      console.log(`  标准差: ${optimizedStats.stdDev}ms`);
      
      console.log(`\n平均性能提升: ${avgImprovement.toFixed(2)}x`);
      
      expect(parseFloat(optimizedStats.mean)).toBeLessThan(parseFloat(originalStats.mean));
    });
  });

  describe("压力测试 - 高并发场景", () => {
    it("应该进行高并发压力测试", () => {
      const config: SchemaConfig = { body: userSchema };
      const iterations = 10000; // 增加测试次数
      const rounds = 5;
      const originalTimes: number[] = [];
      const optimizedTimes: number[] = [];
      
      console.log("=== 高并发压力测试 - 5轮测试 ===");
      console.log(`每轮测试: ${iterations.toLocaleString()}次验证`);
      
      for (let round = 1; round <= rounds; round++) {
        // 测试原来的验证器
        clearUltraCache();
        const start1 = performance.now();
        for (let i = 0; i < iterations; i++) {
          const data: RequestData = { body: validUser };
          validateSchemaConfig(config, data);
        }
        const end1 = performance.now();
        const originalTime = end1 - start1;
        originalTimes.push(originalTime);
        
        // 测试优化后的验证器
        clearUltraCache();
        const start2 = performance.now();
        for (let i = 0; i < iterations; i++) {
          validateAllSchemasUltra(config, { body: validUser });
        }
        const end2 = performance.now();
        const optimizedTime = end2 - start2;
        optimizedTimes.push(optimizedTime);
        
        const improvement = (originalTime / optimizedTime).toFixed(2);
        const throughput = (iterations / (optimizedTime / 1000)).toFixed(0);
        console.log(`第${round}轮: 原来${originalTime.toFixed(2)}ms, 优化${optimizedTime.toFixed(2)}ms, 提升${improvement}x, 吞吐量${throughput}/s`);
      }
      
      const originalStats = calculateStats(originalTimes);
      const optimizedStats = calculateStats(optimizedTimes);
      const avgImprovement = originalTimes.reduce((sum, time, i) => sum + (time / optimizedTimes[i]), 0) / rounds;
      
      console.log("\n=== 压力测试统计结果 ===");
      console.log("原来验证器:");
      console.log(`  平均值: ${originalStats.mean}ms`);
      console.log(`  标准差: ${originalStats.stdDev}ms`);
      console.log(`  总时间: ${originalStats.total}ms`);
      
      console.log("\n优化验证器:");
      console.log(`  平均值: ${optimizedStats.mean}ms`);
      console.log(`  标准差: ${optimizedStats.stdDev}ms`);
      console.log(`  总时间: ${optimizedStats.total}ms`);
      
      console.log(`\n平均性能提升: ${avgImprovement.toFixed(2)}x`);
      console.log(`平均吞吐量: ${(iterations / (parseFloat(optimizedStats.mean) / 1000)).toFixed(0)} 验证/秒`);
      
      expect(parseFloat(optimizedStats.mean)).toBeLessThan(parseFloat(originalStats.mean));
    });
  });
});
