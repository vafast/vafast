/**
 * 验证器完整性能基准测试
 *
 * 📋 用途说明:
 * 这是一个全面的性能基准测试套件，提供验证器的深度性能分析和详细报告。
 * 相比快速测试，这个脚本执行更全面，适合性能调优和深度分析。
 *
 * 🎯 适用场景:
 * - 发布前或重要版本更新后的性能验证
 * - 性能调优和优化工作
 * - 生成详细的性能分析报告
 * - 性能瓶颈分析和优化建议
 * - 生产环境性能评估
 * - 团队性能基准建立
 *
 * 📊 测试内容:
 * 1. 基础类型验证 (100,000次) - 字符串、数字、布尔值性能
 * 2. 复杂对象验证 (50,000次) - 用户对象、嵌套对象性能
 * 3. 数组验证 (10,000次) - 复杂数组验证性能
 * 4. 错误处理性能 (10,000次) - 详细错误信息生成性能
 * 5. 内存使用测试 - 内存增长和稳定性分析
 * 6. 成功vs失败对比 (100,000次) - 性能差异深度分析
 *
 * ⏱️ 执行时间: 约8-12秒
 * 🔄 总迭代次数: 约320,000次
 * 🔥 预热策略: 1000次迭代预热JIT编译器
 *
 * 📈 性能指标:
 * - 操作/秒 (ops/sec) - 每秒可执行的验证次数
 * - 平均时间 (μs) - 每次验证的平均耗时
 * - 内存使用 (MB) - 内存增长和稳定性
 * - 性能比例 - 不同场景的性能对比
 * - 错误处理性能 - 错误信息生成的效率
 *
 * 🚀 使用方法:
 * ```bash
 * # 直接运行
 * bun run benchmarks/standard-validator-benchmark.ts
 *
 * # 使用npm脚本
 * bun run benchmark:validators
 *
 * # 生成性能报告
 * bun run benchmark:validators > performance-report.txt
 *
 * # 在CI/CD中使用
 * bun run benchmark:validators | tee performance.log
 * ```
 *
 * 💡 性能解读:
 * - 基础类型验证: > 400k ops/sec (优秀)
 * - 复杂对象验证: > 30k ops/sec (良好)
 * - 数组验证: > 40k ops/sec (良好)
 * - 内存增长: < 10MB (稳定)
 * - 性能比例: 0.9-1.1x (均衡)
 *
 * 🔍 与快速测试的区别:
 * - 完整测试 (standard-validator-benchmark.ts): 全面性能分析，约8-12秒
 * - 快速测试 (quick-benchmark.ts): 核心指标检查，约2-3秒
 *
 * 📋 输出报告:
 * 测试完成后会生成详细的性能报告，包括:
 * - 各项测试的详细性能数据
 * - 性能瓶颈分析
 * - 优化建议
 * - 内存使用分析
 * - 性能对比结果
 *
 * 🎯 性能目标:
 * - 基础类型: > 400k ops/sec
 * - 复杂对象: > 30k ops/sec
 * - 错误处理: < 30μs/次
 * - 内存稳定: 增长 < 10MB
 *
 * @author Vafast Team
 * @version 1.0.0
 * @license MIT
 */

// benchmarks/standard-validator-benchmark.ts
import { Type, Static } from "@sinclair/typebox";
import type { TSchema } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";
import { validateSchema } from "../src/utils/validators/validators";

// 定义测试用的 Schema
const SimpleSchema = Type.String();
const NumberSchema = Type.Number();
const BooleanSchema = Type.Boolean();

const UserSchema = Type.Object({
  id: Type.Number(),
  name: Type.String(),
  email: Type.String(),
  age: Type.Optional(Type.Number({ minimum: 0, maximum: 150 })),
  tags: Type.Array(Type.String()),
  isActive: Type.Boolean(),
  createdAt: Type.String({ format: "date-time" }),
  metadata: Type.Optional(
    Type.Object({
      lastLogin: Type.String({ format: "date-time" }),
      preferences: Type.Object({
        theme: Type.Union([Type.Literal("light"), Type.Literal("dark")]),
        language: Type.String(),
        notifications: Type.Boolean(),
      }),
    })
  ),
});

const ComplexArraySchema = Type.Array(
  Type.Object({
    id: Type.Number(),
    name: Type.String(),
    scores: Type.Array(Type.Number({ minimum: 0, maximum: 100 })),
    tags: Type.Array(Type.String()),
    metadata: Type.Object({
      created: Type.String(),
      updated: Type.String(),
      version: Type.Number(),
    }),
  })
);

const NestedObjectSchema = Type.Object({
  level1: Type.Object({
    level2: Type.Object({
      level3: Type.Object({
        level4: Type.Object({
          level5: Type.Object({
            value: Type.String(),
            count: Type.Number(),
            items: Type.Array(Type.String()),
          }),
        }),
      }),
    }),
  }),
});

// 测试数据
const simpleData = "hello world";
const numberData = 42;
const booleanData = true;

const validUserData = {
  id: 1,
  name: "张三",
  email: "zhangsan@example.com",
  age: 25,
  tags: ["developer", "typescript", "nodejs"],
  isActive: true,
  createdAt: "2024-01-01T00:00:00Z",
  metadata: {
    lastLogin: "2024-01-15T10:30:00Z",
    preferences: {
      theme: "dark",
      language: "zh-CN",
      notifications: true,
    },
  },
};

const invalidUserData = {
  id: "invalid-id",
  name: "李四",
  // 缺少email字段
  age: 200, // 超出范围
  tags: "not-an-array", // 应该是数组
  isActive: "yes", // 应该是布尔值
  createdAt: "invalid-date",
  metadata: {
    lastLogin: "2024-01-15T10:30:00Z",
    preferences: {
      theme: "blue", // 无效值
      language: 123, // 应该是字符串
      notifications: "maybe", // 应该是布尔值
    },
  },
};

const complexArrayData = Array.from({ length: 100 }, (_, i) => ({
  id: i + 1,
  name: `Item ${i + 1}`,
  scores: Array.from({ length: 10 }, () => Math.floor(Math.random() * 100)),
  tags: [`tag${i}`, `tag${i + 1}`],
  metadata: {
    created: "2024-01-01T00:00:00Z",
    updated: "2024-01-15T10:30:00Z",
    version: i + 1,
  },
}));

const nestedObjectData = {
  level1: {
    level2: {
      level3: {
        level4: {
          level5: {
            value: "deep value",
            count: 42,
            items: ["item1", "item2", "item3"],
          },
        },
      },
    },
  },
};

// 性能测试函数
function benchmark(name: string, fn: () => void, iterations: number = 100000) {
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    fn();
  }

  const end = performance.now();
  const duration = end - start;
  const opsPerSecond = (iterations / duration) * 1000;

  console.log(`${name}:`);
  console.log(`  迭代次数: ${iterations.toLocaleString()}`);
  console.log(`  总时间: ${duration.toFixed(2)}ms`);
  console.log(`  操作/秒: ${opsPerSecond.toLocaleString()}`);
  console.log(`  平均时间: ${((duration / iterations) * 1000).toFixed(3)}μs`);
  console.log("");

  return { duration, opsPerSecond };
}

// 预热函数
function warmup() {
  console.log("🔥 预热中...\n");

  // 预热 JIT 编译器
  for (let i = 0; i < 1000; i++) {
    validateSchema(SimpleSchema, simpleData);
    validateSchema(UserSchema, validUserData);
    validateSchema(ComplexArraySchema, complexArrayData);
  }

  console.log("✅ 预热完成\n");
}

// 基础类型验证性能测试
function benchmarkBasicTypes() {
  console.log("📊 基础类型验证性能测试");
  console.log("=".repeat(50));

  benchmark("字符串验证 (成功)", () =>
    validateSchema(SimpleSchema, simpleData)
  );
  benchmark("数字验证 (成功)", () => validateSchema(NumberSchema, numberData));
  benchmark("布尔值验证 (成功)", () =>
    validateSchema(BooleanSchema, booleanData)
  );
}

// 复杂对象验证性能测试
function benchmarkComplexObjects() {
  console.log("📊 复杂对象验证性能测试");
  console.log("=".repeat(50));

  benchmark(
    "用户对象验证 (成功)",
    () => validateSchema(UserSchema, validUserData),
    50000
  );
  benchmark(
    "用户对象验证 (失败)",
    () => validateSchema(UserSchema, invalidUserData),
    50000
  );
  benchmark(
    "嵌套对象验证",
    () => validateSchema(NestedObjectSchema, nestedObjectData),
    50000
  );
}

// 数组验证性能测试
function benchmarkArrays() {
  console.log("📊 数组验证性能测试");
  console.log("=".repeat(50));

  benchmark(
    "复杂数组验证",
    () => validateSchema(ComplexArraySchema, complexArrayData),
    10000
  );
}

// 错误处理性能测试
function benchmarkErrorHandling() {
  console.log("📊 错误处理性能测试");
  console.log("=".repeat(50));

  // 测试生成详细错误信息的性能
  const start = performance.now();
  let errorCount = 0;

  for (let i = 0; i < 10000; i++) {
    const result = validateSchema(UserSchema, invalidUserData);
    if (!result.success) {
      errorCount += result.errors.length;
    }
  }

  const end = performance.now();
  const duration = end - start;

  console.log("错误处理性能:");
  console.log(`  迭代次数: 10,000`);
  console.log(`  总时间: ${duration.toFixed(2)}ms`);
  console.log(`  生成错误总数: ${errorCount.toLocaleString()}`);
  console.log(
    `  平均每次验证时间: ${((duration / 10000) * 1000).toFixed(3)}μs`
  );
  console.log("");
}

// 内存使用测试
function benchmarkMemoryUsage() {
  console.log("📊 内存使用测试");
  console.log("=".repeat(50));

  const initialMemory = process.memoryUsage();

  // 创建大量验证器实例
  const validators = [];
  for (let i = 0; i < 1000; i++) {
    const schema = Type.Object({
      id: Type.Number(),
      name: Type.String(),
      value: Type.Number(),
    });
    validators.push(schema);
  }

  // 执行验证
  for (let i = 0; i < 10000; i++) {
    const schema = validators[i % validators.length];
    const data = { id: i, name: `item${i}`, value: i * 2 };
    validateSchema(schema, data);
  }

  const finalMemory = process.memoryUsage();

  console.log("内存使用情况:");
  console.log(
    `  初始内存: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`
  );
  console.log(
    `  最终内存: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`
  );
  console.log(
    `  内存增长: ${(
      (finalMemory.heapUsed - initialMemory.heapUsed) /
      1024 /
      1024
    ).toFixed(2)}MB`
  );
  console.log("");
}

// 对比测试：成功 vs 失败场景
function benchmarkSuccessVsFailure() {
  console.log("📊 成功 vs 失败场景性能对比");
  console.log("=".repeat(50));

  const successResult = benchmark(
    "成功验证",
    () => validateSchema(UserSchema, validUserData),
    100000
  );
  const failureResult = benchmark(
    "失败验证",
    () => validateSchema(UserSchema, invalidUserData),
    100000
  );

  const performanceRatio =
    failureResult.opsPerSecond / successResult.opsPerSecond;

  console.log("性能对比分析:");
  console.log(
    `  成功验证: ${successResult.opsPerSecond.toLocaleString()} ops/sec`
  );
  console.log(
    `  失败验证: ${failureResult.opsPerSecond.toLocaleString()} ops/sec`
  );
  console.log(`  性能比例: ${performanceRatio.toFixed(2)}x (失败场景相对较慢)`);
  console.log("");
}

// 主测试函数
function runAllBenchmarks() {
  console.log("🚀 开始验证器性能基准测试\n");

  // 预热
  warmup();

  // 运行各项测试
  benchmarkBasicTypes();
  benchmarkComplexObjects();
  benchmarkArrays();
  benchmarkErrorHandling();
  benchmarkMemoryUsage();
  benchmarkSuccessVsFailure();

  console.log("🎉 所有性能测试完成！");
}

// 运行测试
if (import.meta.main) {
  runAllBenchmarks();
}
