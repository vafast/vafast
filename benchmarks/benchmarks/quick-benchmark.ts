/**
 * 验证器快速性能测试
 *
 * 📋 用途说明:
 * 这是一个轻量级的性能测试脚本，专门用于快速评估验证器的核心性能指标。
 * 相比完整的 validators-benchmark.ts，这个脚本执行更快，专注于关键性能数据。
 *
 * 🎯 适用场景:
 * - 日常开发中的快速性能检查
 * - CI/CD 流程中的性能回归测试
 * - 快速验证性能变化和优化效果
 * - 团队内部性能分享和讨论
 * - 开发环境中的性能监控
 *
 * 📊 测试内容:
 * 1. 简单字符串验证 (100,000次) - 测试基础类型性能
 * 2. 复杂对象验证成功 (10,000次) - 测试复杂Schema成功场景
 * 3. 复杂对象验证失败 (10,000次) - 测试复杂Schema失败场景
 * 4. 性能对比分析 - 成功vs失败场景的性能差异
 *
 * ⚡ 执行时间: 约2-3秒
 * 🔄 总迭代次数: 约120,000次
 *
 * 📈 性能指标:
 * - 操作/秒 (ops/sec) - 每秒可执行的验证次数
 * - 平均时间 (μs) - 每次验证的平均耗时
 * - 性能比例 - 成功和失败场景的性能对比
 *
 * 🚀 使用方法:
 * ```bash
 * # 直接运行
 * bun run benchmarks/quick-benchmark.ts
 *
 * # 使用npm脚本
 * bun run benchmark:quick
 *
 * # 在CI/CD中使用
 * bun run benchmark:quick > performance.log
 * ```
 *
 * 💡 性能解读:
 * - 基础类型验证: 通常 > 500k ops/sec (优秀)
 * - 复杂对象验证: 通常 > 50k ops/sec (良好)
 * - 性能比例: 0.9-1.1x 表示均衡，>1.1x 或 <0.9x 需要关注
 *
 * 🔍 与完整测试的区别:
 * - 完整测试 (validators-benchmark.ts): 全面性能分析，约8-12秒
 * - 快速测试 (quick-benchmark.ts): 核心指标检查，约2-3秒
 *
 * @author Vafast Team
 * @version 1.0.0
 * @license MIT
 */

// benchmarks/quick-benchmark.ts
import { Type } from "@sinclair/typebox";
import { validateSchema } from "../src/utils/validators/validators";

// 快速性能测试
function quickBenchmark() {
  console.log("⚡ 快速性能测试\n");

  // 简单Schema
  const SimpleSchema = Type.String();
  const simpleData = "test";

  // 复杂Schema
  const ComplexSchema = Type.Object({
    id: Type.Number(),
    name: Type.String(),
    email: Type.String(),
    age: Type.Optional(Type.Number()),
    tags: Type.Array(Type.String()),
  });

  const complexData = {
    id: 1,
    name: "张三",
    email: "test@example.com",
    age: 25,
    tags: ["developer", "typescript"],
  };

  const invalidData = {
    id: "invalid",
    name: "李四",
    // 缺少email
    age: "twenty-five",
    tags: "not-array",
  };

  // 测试简单验证
  console.log("📊 简单字符串验证");
  const start1 = performance.now();
  for (let i = 0; i < 100000; i++) {
    validateSchema(SimpleSchema, simpleData);
  }
  const end1 = performance.now();
  console.log(`  100,000次验证: ${(end1 - start1).toFixed(2)}ms`);
  console.log(`  性能: ${((100000 / (end1 - start1)) * 1000).toFixed(0)} ops/sec\n`);

  // 测试复杂验证 (成功)
  console.log("📊 复杂对象验证 (成功)");
  const start2 = performance.now();
  for (let i = 0; i < 10000; i++) {
    validateSchema(ComplexSchema, complexData);
  }
  const end2 = performance.now();
  console.log(`  10,000次验证: ${(end2 - start2).toFixed(2)}ms`);
  console.log(`  性能: ${((10000 / (end2 - start2)) * 1000).toFixed(0)} ops/sec\n`);

  // 测试复杂验证 (失败)
  console.log("📊 复杂对象验证 (失败)");
  const start3 = performance.now();
  for (let i = 0; i < 10000; i++) {
    validateSchema(ComplexSchema, invalidData);
  }
  const end3 = performance.now();
  console.log(`  10,000次验证: ${(end3 - start3).toFixed(2)}ms`);
  console.log(`  性能: ${((10000 / (end3 - start3)) * 1000).toFixed(0)} ops/sec\n`);

  // 性能对比
  const successOps = (10000 / (end2 - start2)) * 1000;
  const failureOps = (10000 / (end3 - start3)) * 1000;
  const ratio = failureOps / successOps;

  console.log("📈 性能对比");
  console.log(`  成功验证: ${successOps.toFixed(0)} ops/sec`);
  console.log(`  失败验证: ${failureOps.toFixed(0)} ops/sec`);
  console.log(`  性能比例: ${ratio.toFixed(2)}x`);

  if (ratio > 1.1) {
    console.log("  💡 失败验证比成功验证慢，可能需要优化错误处理");
  } else if (ratio < 0.9) {
    console.log("  💡 成功验证比失败验证慢，可能需要优化验证逻辑");
  } else {
    console.log("  ✅ 成功和失败验证性能均衡");
  }
}

// 运行测试
if (import.meta.main) {
  quickBenchmark();
}
