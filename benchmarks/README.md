# Vafast 性能基准测试

科学的基准测试套件，使用最佳实践进行性能测量。

## 📁 目录结构

```
benchmarks/
├── lib/                    # 测试工具库
│   └── bench.ts            # 科学的基准测试工具
├── micro/                  # 微基准测试 (单个组件)
│   ├── router.bench.ts     # 路由器性能
│   ├── handler.bench.ts    # 处理器性能
│   └── server.bench.ts     # 服务器端到端性能
├── macro/                  # 宏基准测试 (完整场景)
│   └── http.bench.ts       # HTTP 请求处理
├── performance-regression.test.ts  # 性能回归测试
└── README.md
```

## 🔬 测试方法论

### 科学的基准测试

我们的测试工具遵循基准测试最佳实践：

1. **预热阶段** - 消除 JIT 编译和缓存影响
2. **多轮运行** - 默认 10 轮，取统计值
3. **统计分析** - 计算 mean, median, P95, P99, stdDev
4. **GC 控制** - 每轮之间尝试触发 GC

### 测量指标

- **ops/sec** - 每秒操作数
- **ns/op** - 单次操作耗时（纳秒）
- **stdDev** - 标准差（衡量稳定性）
- **P95/P99** - 尾部延迟

## 🚀 运行方式

```bash
# 运行微基准测试
npm run benchmarks/micro/router.bench.ts
npm run benchmarks/micro/handler.bench.ts
npm run benchmarks/micro/server.bench.ts

# 运行宏基准测试
npm run benchmarks/macro/http.bench.ts

# 运行性能回归测试 (CI/CD 用)
npm run vitest run benchmarks/
```

## 📊 测试类型

### 微基准测试 (Micro)

测试单个组件的性能：

| 测试 | 目标 | 说明 |
|------|------|------|
| router.bench.ts | RadixRouter | 路由匹配、注册、缓存效果 |
| handler.bench.ts | createHandler | 处理器创建、响应转换 |
| server.bench.ts | Server.fetch | 端到端请求处理 |

### 宏基准测试 (Macro)

测试真实应用场景：

| 测试 | 说明 |
|------|------|
| http.bench.ts | 模拟真实 HTTP 请求、并发、混合负载 |

### 回归测试

确保性能不退化：

```typescript
// 阈值配置示例
const THRESHOLDS = {
  routerStaticMatch: 0.005,  // < 5µs
  serverSimpleRequest: 0.05, // < 50µs
};
```

## 📈 性能目标

| 场景 | 目标 |
|------|------|
| 静态路由匹配 | > 200K ops/sec |
| 动态参数匹配 | > 100K ops/sec |
| 简单请求处理 | > 50K ops/sec |
| Schema 验证请求 | > 10K ops/sec |

## 🧪 使用测试工具

```typescript
import { BenchSuite, bench, printResult } from "./lib/bench";

// 方式 1: 单个测试
const result = await bench(
  { name: "我的测试", iterations: 10000 },
  () => {
    // 被测代码
  }
);
printResult(result);

// 方式 2: 测试套件
const suite = new BenchSuite("我的套件");
await suite.add({ name: "测试 A" }, () => { /* ... */ });
await suite.add({ name: "测试 B" }, () => { /* ... */ });
suite.print();
```

## 📝 测试配置

```typescript
interface BenchConfig {
  name: string;      // 测试名称
  warmup?: number;   // 预热次数 (默认 1000)
  iterations?: number; // 每轮迭代次数 (默认 10000)
  rounds?: number;   // 运行轮数 (默认 10)
}
```

## ⚠️ 注意事项

1. **避免在测试中创建对象** - 会影响 GC
2. **使用相同的输入** - 确保公平对比
3. **多次运行** - 单次结果可能不准确
4. **关注 P99** - 尾部延迟很重要
5. **隔离环境** - 关闭其他程序

## 🔄 CI/CD 集成

性能回归测试可作为 CI/CD 的一部分：

```yaml
# .github/workflows/benchmark.yml
- name: Run performance tests
  run: npm test benchmarks/performance-regression.test.ts
```
