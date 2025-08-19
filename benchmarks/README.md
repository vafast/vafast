# Vafast 性能基准测试

本目录包含了 Vafast 框架的完整性能测试套件，用于评估框架的性能表现和优化效果。

## 🚀 快速开始

### 运行所有基准测试
```bash
# 使用 bun (推荐)
bun run benchmark

# 使用 npm
npm run benchmark

# 使用 yarn
yarn benchmark
```

### 运行特定测试
```bash
# 快速基准测试
bun run benchmarks/benchmarks/quick-benchmark.ts

# 验证器性能测试
bun run benchmarks/benchmarks/validators-benchmark.ts

# 超性能测试
bun run benchmarks/benchmarks/ultra-performance-test.ts

# 终极性能测试
bun run benchmarks/benchmarks/ultimate-performance-test.ts

# 综合性能测试
bun run benchmarks/benchmarks/comprehensive-benchmark.ts
```

## 📊 测试分类

### ⚡ 基准测试 (`benchmarks/`)
性能基准测试，用于性能对比和优化：
- `quick-benchmark.ts` - 快速性能测试
- `validators-benchmark.ts` - 验证器性能测试
- `ultra-performance-test.ts` - 超性能测试
- `ultimate-performance-test.ts` - 终极性能测试
- `comprehensive-benchmark.ts` - 综合性能测试

### 🧪 性能测试 (`performance/`)
性能回归测试，确保性能不退化：
- `regression/` - 性能回归测试
- `stress/` - 压力测试
- `memory/` - 内存使用测试

### 📈 性能分析 (`analysis/`)
性能数据分析和报告：
- `performance-report.ts` - 性能报告生成
- `comparison.ts` - 性能对比分析

## 🎯 测试场景

### 基础性能测试
- **路由匹配**: 静态路由、动态路由、通配符路由
- **中间件链**: 不同长度的中间件链性能
- **请求处理**: 简单响应、复杂响应、错误处理

### 验证器性能测试
- **Schema编译**: TypeBox Schema编译性能
- **数据验证**: 不同类型数据的验证性能
- **缓存效果**: 验证器缓存对性能的影响

### 压力测试
- **高并发**: 模拟大量并发请求
- **长时间运行**: 持续性能稳定性
- **内存使用**: 内存泄漏检测

## 📊 性能指标

### 响应时间
- 平均响应时间 (ms)
- 95%分位响应时间 (ms)
- 99%分位响应时间 (ms)
- 最大响应时间 (ms)

### 吞吐量
- 请求/秒 (RPS)
- 并发处理能力
- 资源利用率

### 资源使用
- CPU使用率
- 内存使用量
- 垃圾回收频率

## 🔧 测试配置

### 环境配置
```typescript
const TEST_CONFIG = {
  iterations: 500_000,        // 单线程测试次数
  concurrency: 100,           // 并发测试线程数
  totalRequests: 5_000_000,   // 并发测试总请求数
  warmupRequests: 1000,       // 预热请求数
  validatorIterations: 1000,  // 验证器测试次数
  validatorRuns: 5            // 验证器测试运行次数
};
```

### 自定义配置
```bash
# 设置测试参数
BENCHMARK_ITERATIONS=1000000 bun run benchmark
BENCHMARK_CONCURRENCY=200 bun run benchmark
```

## 📈 结果分析

### 性能报告
- 详细的性能数据
- 性能对比图表
- 性能趋势分析
- 优化建议

### 性能回归检测
- 与历史基准对比
- 性能变化趋势
- 异常性能检测
- 自动告警机制

## 🐛 故障排除

### 常见问题
1. **测试超时**: 增加超时时间或减少测试规模
2. **内存不足**: 减少并发数或测试数据量
3. **性能不稳定**: 确保测试环境一致性

### 调试技巧
```bash
# 启用详细日志
DEBUG=vafast:benchmark bun run benchmark

# 单步调试
bun --inspect-brk run benchmarks/benchmarks/quick-benchmark.ts
```

## 🤝 贡献基准测试

### 添加新测试
1. 创建新的测试文件
2. 遵循命名规范：`*-benchmark.ts`
3. 添加完整的测试用例
4. 包含性能分析和优化建议

### 测试规范
- 测试应该是可重复的
- 包含详细的性能指标
- 提供性能优化建议
- 支持自定义配置

## 📚 相关资源

- [性能优化指南](../docs/advanced/performance.md)
- [测试策略](../docs/advanced/testing.md)
- [贡献指南](../docs/contributing/)

---

**提示**: 定期运行基准测试，监控性能变化，及时发现性能回归问题。
