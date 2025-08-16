/**
 * 验证器性能对比测试
 *
 * 比较schema-validator和validators-ultra在相同数据下的性能差异
 */

import { Type } from "@sinclair/typebox";
import {
  validateSchemaConfig,
  validateSchemaConfigAsync,
  createSchemaValidator,
  createAsyncSchemaValidator,
} from "../src/utils/validators/schema-validator";
import { validateAllSchemasUltra } from "../src/utils/validators/validators-ultra";

// 测试用的Schema定义
const userSchema = Type.Object({
  id: Type.Number(),
  name: Type.String({ minLength: 1, maxLength: 100 }),
  email: Type.String({ pattern: "^[^@]+@[^@]+\\.[^@]+$" }),
  age: Type.Optional(Type.Number({ minimum: 0, maximum: 150 })),
  profile: Type.Object({
    bio: Type.Optional(Type.String()),
    avatar: Type.Optional(Type.String()),
    preferences: Type.Array(Type.String()),
  }),
  metadata: Type.Object({
    createdAt: Type.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$" }),
    updatedAt: Type.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$" }),
    tags: Type.Array(Type.String()),
  }),
});

const querySchema = Type.Object({
  page: Type.Number({ minimum: 1 }),
  limit: Type.Number({ minimum: 1, maximum: 100 }),
  search: Type.Optional(Type.String()),
  sortBy: Type.Optional(
    Type.Union([Type.Literal("name"), Type.Literal("age"), Type.Literal("createdAt")])
  ),
  order: Type.Optional(Type.Union([Type.Literal("asc"), Type.Literal("desc")])),
});

const paramsSchema = Type.Object({
  userId: Type.String({ pattern: "^[0-9a-fA-F]{24}$" }),
  action: Type.Optional(Type.String()),
});

const headersSchema = Type.Object({
  authorization: Type.String({ pattern: "^Bearer .*" }),
  "content-type": Type.Optional(Type.String()),
  "x-request-id": Type.Optional(Type.String()),
  "user-agent": Type.Optional(Type.String()),
});

const cookiesSchema = Type.Object({
  sessionId: Type.String(),
  theme: Type.Optional(Type.Union([Type.Literal("light"), Type.Literal("dark")])),
  language: Type.Optional(Type.String()),
});

// 创建Schema配置
const schemaConfig = {
  body: userSchema,
  query: querySchema,
  params: paramsSchema,
  headers: headersSchema,
  cookies: cookiesSchema,
};

// 测试数据
const testData = {
  body: {
    id: 1,
    name: "张三",
    email: "zhangsan@example.com",
    age: 25,
    profile: {
      bio: "热爱编程的开发者",
      avatar: "https://example.com/avatar.jpg",
      preferences: ["编程", "阅读", "音乐"],
    },
    metadata: {
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-15T12:00:00Z",
      tags: ["开发者", "前端", "TypeScript"],
    },
  },
  query: {
    page: 1,
    limit: 20,
    search: "用户",
    sortBy: "name",
    order: "asc",
  },
  params: {
    userId: "507f1f77bcf86cd799439011",
    action: "update",
  },
  headers: {
    authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "content-type": "application/json",
    "x-request-id": "req_123456789",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  },
  cookies: {
    sessionId: "sess_123456789",
    theme: "dark",
    language: "zh-CN",
  },
};

// 性能测试函数
function runPerformanceTest(
  testName: string,
  testFunction: () => void,
  iterations: number = 10000
): { name: string; totalTime: number; avgTime: number; opsPerSecond: number } {
  console.log(`\n🚀 开始测试: ${testName}`);
  console.log(`📊 测试迭代次数: ${iterations.toLocaleString()}`);

  // 预热
  for (let i = 0; i < 1000; i++) {
    testFunction();
  }

  const startTime = performance.now();

  for (let i = 0; i < iterations; i++) {
    testFunction();
  }

  const endTime = performance.now();
  const totalTime = endTime - startTime;
  const avgTime = totalTime / iterations;
  const opsPerSecond = (iterations / totalTime) * 1000;

  console.log(`⏱️  总耗时: ${totalTime.toFixed(2)}ms`);
  console.log(`📈 平均耗时: ${avgTime.toFixed(6)}ms`);
  console.log(`⚡ 每秒操作数: ${opsPerSecond.toLocaleString()}`);

  return {
    name: testName,
    totalTime,
    avgTime,
    opsPerSecond,
  };
}

// 测试函数
function testSchemaValidator() {
  try {
    const result = validateSchemaConfig(schemaConfig, testData);
    if (!result.success) {
      throw new Error("验证失败");
    }
  } catch (error) {
    throw new Error(`Schema验证器错误: ${error}`);
  }
}

function testSchemaValidatorAsync() {
  try {
    // 注意：这里我们需要等待异步结果，但为了性能测试，我们使用同步方式
    // 实际测试中会使用await
    return Promise.resolve().then(() => {
      return validateSchemaConfigAsync(schemaConfig, testData);
    });
  } catch (error) {
    throw new Error(`Schema异步验证器错误: ${error}`);
  }
}

function testValidatorsUltra() {
  try {
    const result = validateAllSchemasUltra(schemaConfig, testData);
    if (!result) {
      throw new Error("验证失败");
    }
  } catch (error) {
    throw new Error(`Ultra验证器错误: ${error}`);
  }
}

// 异步性能测试函数
async function runAsyncPerformanceTest(
  testName: string,
  testFunction: () => Promise<any>,
  iterations: number = 10000
): Promise<{ name: string; totalTime: number; avgTime: number; opsPerSecond: number }> {
  console.log(`\n🚀 开始异步测试: ${testName}`);
  console.log(`📊 测试迭代次数: ${iterations.toLocaleString()}`);

  // 预热
  for (let i = 0; i < 100; i++) {
    await testFunction();
  }

  const startTime = performance.now();

  for (let i = 0; i < iterations; i++) {
    await testFunction();
  }

  const endTime = performance.now();
  const totalTime = endTime - startTime;
  const avgTime = totalTime / iterations;
  const opsPerSecond = (iterations / totalTime) * 1000;

  console.log(`⏱️  总耗时: ${totalTime.toFixed(2)}ms`);
  console.log(`📈 平均耗时: ${avgTime.toFixed(6)}ms`);
  console.log(`⚡ 每秒操作数: ${opsPerSecond.toLocaleString()}`);

  return {
    name: testName,
    totalTime,
    avgTime,
    opsPerSecond,
  };
}

// 异步验证器性能测试
function testAsyncValidator() {
  try {
    const validator = createSchemaValidator(schemaConfig);
    const result = validator(testData);
    if (!result.success) {
      throw new Error("验证失败");
    }
  } catch (error) {
    throw new Error(`异步验证器错误: ${error}`);
  }
}

async function testAsyncFactoryValidator() {
  try {
    const validator = createAsyncSchemaValidator(schemaConfig);
    const result = await validator(testData);
    if (!result.success) {
      throw new Error("验证失败");
    }
  } catch (error) {
    throw new Error(`异步工厂验证器错误: ${error}`);
  }
}

// 内存使用测试
function measureMemoryUsage(testFunction: () => void, iterations: number = 1000): number {
  const initialMemory = process.memoryUsage().heapUsed;

  for (let i = 0; i < iterations; i++) {
    testFunction();
  }

  const finalMemory = process.memoryUsage().heapUsed;
  return finalMemory - initialMemory;
}

// 主测试函数
async function runAllTests() {
  console.log("🔬 验证器性能对比测试 (包含异步验证器)");
  console.log("=".repeat(60));

  const results: Array<{ name: string; totalTime: number; avgTime: number; opsPerSecond: number }> =
    [];

  // 测试1: 小规模测试 (1,000次)
  console.log("\n📊 小规模测试 (1,000次迭代)");
  results.push(runPerformanceTest("Schema验证器 (1K)", testSchemaValidator, 1000));
  results.push(runPerformanceTest("Ultra验证器 (1K)", testValidatorsUltra, 1000));
  results.push(runPerformanceTest("异步验证器 (1K)", testAsyncValidator, 1000));

  // 测试2: 中等规模测试 (10,000次迭代)
  console.log("\n📊 中等规模测试 (10,000次迭代)");
  results.push(runPerformanceTest("Schema验证器 (10K)", testSchemaValidator, 10000));
  results.push(runPerformanceTest("Ultra验证器 (10K)", testValidatorsUltra, 10000));
  results.push(runPerformanceTest("异步验证器 (10K)", testAsyncValidator, 10000));

  // 测试3: 大规模测试 (100,000次迭代)
  console.log("\n📊 大规模测试 (100,000次迭代)");
  results.push(runPerformanceTest("Schema验证器 (100K)", testSchemaValidator, 100000));
  results.push(runPerformanceTest("Ultra验证器 (100K)", testValidatorsUltra, 100000));
  results.push(runPerformanceTest("异步验证器 (100K)", testAsyncValidator, 100000));

  // 异步验证器测试 (较小规模，因为异步操作较慢)
  console.log("\n📊 异步验证器测试 (1,000次迭代)");
  const asyncResults = await Promise.all([
    runAsyncPerformanceTest("Schema异步验证器 (1K)", testSchemaValidatorAsync, 1000),
    runAsyncPerformanceTest("异步工厂验证器 (1K)", testAsyncFactoryValidator, 1000),
  ]);
  results.push(...asyncResults);

  // 内存使用测试
  console.log("\n💾 内存使用测试 (1,000次迭代)");
  const schemaMemory = measureMemoryUsage(testSchemaValidator, 1000);
  const ultraMemory = measureMemoryUsage(testValidatorsUltra, 1000);
  const asyncMemory = measureMemoryUsage(testAsyncValidator, 1000);

  console.log(`📊 Schema验证器内存使用: ${(schemaMemory / 1024).toFixed(2)} KB`);
  console.log(`📊 Ultra验证器内存使用: ${(ultraMemory / 1024).toFixed(2)} KB`);
  console.log(`📊 异步验证器内存使用: ${(asyncMemory / 1024).toFixed(2)} KB`);

  // 性能对比分析
  console.log("\n📊 性能对比分析");
  console.log("=".repeat(60));

  const schema10K = results.find((r) => r.name === "Schema验证器 (10K)");
  const ultra10K = results.find((r) => r.name === "Ultra验证器 (10K)");
  const async10K = results.find((r) => r.name === "异步验证器 (10K)");

  if (schema10K && ultra10K && async10K) {
    const ultraSpeedup = schema10K.totalTime / ultra10K.totalTime;
    const asyncSpeedup = schema10K.totalTime / async10K.totalTime;

    console.log(`🚀 Ultra验证器相对Schema验证器的性能提升: ${ultraSpeedup.toFixed(2)}x`);
    console.log(`🚀 异步验证器相对Schema验证器的性能提升: ${asyncSpeedup.toFixed(2)}x`);

    if (ultraSpeedup > asyncSpeedup) {
      console.log(`✅ Ultra验证器最快，性能提升 ${((ultraSpeedup - 1) * 100).toFixed(1)}%`);
    } else {
      console.log(`✅ 异步验证器最快，性能提升 ${((asyncSpeedup - 1) * 100).toFixed(1)}%`);
    }
  }

  // 异步验证器性能分析
  const schemaAsync1K = results.find((r) => r.name === "Schema异步验证器 (1K)");
  const asyncFactory1K = results.find((r) => r.name === "异步工厂验证器 (1K)");

  if (schemaAsync1K && asyncFactory1K) {
    const asyncSpeedup = schemaAsync1K.totalTime / asyncFactory1K.totalTime;
    console.log(`🚀 异步工厂验证器相对Schema异步验证器的性能提升: ${asyncSpeedup.toFixed(2)}x`);
  }

  // 详细结果表格
  console.log("\n📋 详细测试结果");
  console.log("=".repeat(100));
  console.log(
    "验证器名称".padEnd(30) +
      "迭代次数".padEnd(12) +
      "总耗时(ms)".padEnd(15) +
      "平均耗时(ms)".padEnd(18) +
      "每秒操作数"
  );
  console.log("-".repeat(100));

  results.forEach((result) => {
    const name = result.name.padEnd(30);
    const iterations = result.name.includes("1K")
      ? "1,000".padEnd(12)
      : result.name.includes("10K")
      ? "10,000".padEnd(12)
      : "100,000".padEnd(12);
    const totalTime = result.totalTime.toFixed(2).padEnd(15);
    const avgTime = result.avgTime.toFixed(6).padEnd(18);
    const opsPerSecond = result.opsPerSecond.toLocaleString();

    console.log(name + iterations + totalTime + avgTime + opsPerSecond);
  });

  // 性能排名
  console.log("\n🏆 性能排名 (基于10K测试结果)");
  console.log("=".repeat(40));

  const syncValidators = results.filter((r) => r.name.includes("10K") && !r.name.includes("异步"));

  const sortedValidators = syncValidators.sort((a, b) => a.totalTime - b.totalTime);

  sortedValidators.forEach((validator, index) => {
    const rank = index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉";
    const name = validator.name.replace(" (10K)", "");
    console.log(`${rank} ${name}: ${validator.totalTime.toFixed(2)}ms`);
  });

  console.log("\n🎯 测试完成！");
}

// 如果直接运行此文件
if (require.main === module) {
  runAllTests().catch(console.error);
}

export {
  runPerformanceTest,
  testSchemaValidator,
  testValidatorsUltra,
  measureMemoryUsage,
  runAllTests,
};
