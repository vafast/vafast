/**
 * Ultra验证器性能测试
 *
 * 测试Ultra验证器的性能表现
 */

import { Type } from "@sinclair/typebox";
import {
  validateAllSchemasUltra,
  validateAllSchemasUltraExpanded,
  createTypedValidatorUltra,
  validateBatchUltra,
  getCacheStats,
  smartClearUltraCache,
} from "../src/utils/validators/validators-ultra";

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

// 批量测试数据
const batchTestData = Array.from({ length: 100 }, (_, i) => ({
  id: i + 1,
  name: `用户${i + 1}`,
  email: `user${i + 1}@example.com`,
}));

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
function testUltraStandard() {
  try {
    const result = validateAllSchemasUltra(schemaConfig, testData);
    if (!result) {
      throw new Error("验证失败");
    }
  } catch (error) {
    throw new Error(`Ultra标准版错误: ${error}`);
  }
}

function testUltraExpanded() {
  try {
    const result = validateAllSchemasUltraExpanded(schemaConfig, testData);
    if (!result) {
      throw new Error("验证失败");
    }
  } catch (error) {
    throw new Error(`Ultra展开版错误: ${error}`);
  }
}

function testTypedValidator() {
  try {
    const validator = createTypedValidatorUltra(userSchema);
    const result = validator(testData.body);
    if (!result) {
      throw new Error("验证失败");
    }
  } catch (error) {
    throw new Error(`类型验证器错误: ${error}`);
  }
}

function testBatchValidator() {
  try {
    // 使用简化的Schema进行批量验证
    const simpleSchema = Type.Object({
      id: Type.Number(),
      name: Type.String({ minLength: 1 }),
      email: Type.String({ pattern: "^[^@]+@[^@]+\\.[^@]+$" }),
    });

    const result = validateBatchUltra(simpleSchema, batchTestData);
    if (result.length !== batchTestData.length) {
      throw new Error("批量验证失败");
    }
  } catch (error) {
    throw new Error(`批量验证器错误: ${error}`);
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
  console.log("🔬 Ultra验证器性能测试");
  console.log("=".repeat(60));

  const results: Array<{ name: string; totalTime: number; avgTime: number; opsPerSecond: number }> = [];

  // 测试1: 小规模测试 (1,000次)
  console.log("\n📊 小规模测试 (1,000次迭代)");
  results.push(runPerformanceTest("Ultra标准版 (1K)", testUltraStandard, 1000));
  results.push(runPerformanceTest("Ultra展开版 (1K)", testUltraExpanded, 1000));

  // 测试2: 中等规模测试 (10,000次)
  console.log("\n📊 中等规模测试 (10,000次迭代)");
  results.push(runPerformanceTest("Ultra标准版 (10K)", testUltraStandard, 10000));
  results.push(runPerformanceTest("Ultra展开版 (10K)", testUltraExpanded, 10000));

  // 测试3: 大规模测试 (100,000次)
  console.log("\n📊 大规模测试 (100,000次迭代)");
  results.push(runPerformanceTest("Ultra标准版 (100K)", testUltraStandard, 100000));
  results.push(runPerformanceTest("Ultra展开版 (100K)", testUltraExpanded, 100000));

  // 测试4: 特殊功能测试
  console.log("\n📊 特殊功能测试 (1,000次迭代)");
  results.push(runPerformanceTest("类型验证器 (1K)", testTypedValidator, 1000));
  results.push(runPerformanceTest("批量验证器 (1K)", testBatchValidator, 1000));

  // 内存使用测试
  console.log("\n💾 内存使用测试 (1,000次迭代)");
  const standardMemory = measureMemoryUsage(testUltraStandard, 1000);
  const expandedMemory = measureMemoryUsage(testUltraExpanded, 1000);

  console.log(`📊 Ultra标准版 内存使用: ${(standardMemory / 1024).toFixed(2)} KB`);
  console.log(`📊 Ultra展开版 内存使用: ${(expandedMemory / 1024).toFixed(2)} KB`);

  // 性能对比分析
  console.log("\n📊 性能对比分析");
  console.log("=".repeat(60));

  const standard_10K = results.find((r) => r.name === "Ultra标准版 (10K)");
  const expanded_10K = results.find((r) => r.name === "Ultra展开版 (10K)");

  if (standard_10K && expanded_10K) {
    const speedup = standard_10K.totalTime / expanded_10K.totalTime;
    console.log(`🚀 Ultra展开版 相对 标准版 的性能提升: ${speedup.toFixed(2)}x`);
    console.log(`📈 性能提升百分比: ${((speedup - 1) * 100).toFixed(1)}%`);

    if (speedup > 1) {
      console.log(`✅ Ultra展开版 更快，性能提升 ${((speedup - 1) * 100).toFixed(1)}%`);
    } else {
      console.log(`✅ Ultra标准版 更快，性能提升 ${((1/speedup - 1) * 100).toFixed(1)}%`);
    }
  }

  // 缓存统计
  console.log("\n📊 缓存统计信息");
  console.log("=".repeat(40));
  const cacheStats = getCacheStats();
  console.log(`📈 总Schema数量: ${cacheStats.totalSchemas}`);
  console.log(`🎯 总命中次数: ${cacheStats.totalHits}`);
  console.log(`📊 缓存命中率: ${cacheStats.hitRate}`);
  console.log(`💾 内存效率: ${cacheStats.memoryEfficiency}`);
  console.log(`🔧 错误池使用: ${cacheStats.errorPoolUsage}`);

  // 详细结果表格
  console.log("\n📋 详细测试结果");
  console.log("=".repeat(100));
  console.log(
    "验证器名称".padEnd(35) +
      "迭代次数".padEnd(12) +
      "总耗时(ms)".padEnd(15) +
      "平均耗时(ms)".padEnd(18) +
      "每秒操作数"
  );
  console.log("-".repeat(100));

  results.forEach((result) => {
    const name = result.name.padEnd(35);
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
  console.log("=".repeat(50));

  const tenKResults = results.filter((r) => r.name.includes("10K"));
  const sortedResults = tenKResults.sort((a, b) => a.totalTime - b.totalTime);

  sortedResults.forEach((result, index) => {
    const rank = index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉";
    const name = result.name.replace(" (10K)", "");
    console.log(`${rank} ${name}: ${result.totalTime.toFixed(2)}ms`);
  });

  console.log("\n🎯 测试完成！");
}

// 如果直接运行此文件
if (require.main === module) {
  runAllTests().catch(console.error);
}

export {
  runPerformanceTest,
  testUltraStandard,
  testUltraExpanded,
  testTypedValidator,
  testBatchValidator,
  measureMemoryUsage,
  runAllTests,
};
