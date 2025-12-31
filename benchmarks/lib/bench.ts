/**
 * 科学的微基准测试工具
 *
 * 特性:
 * - 预热阶段消除 JIT 编译影响
 * - 多轮运行取统计值
 * - 计算平均值、中位数、P95、P99
 * - 自动 GC（如果可用）
 * - 结果格式化输出
 */

/** 基准测试配置 */
export interface BenchConfig {
  /** 测试名称 */
  name: string;
  /** 预热次数 */
  warmup?: number;
  /** 每轮迭代次数 */
  iterations?: number;
  /** 运行轮数 */
  rounds?: number;
}

/** 单轮结果 */
interface RoundResult {
  duration: number; // ms
  ops: number; // 操作数
  opsPerSec: number; // 每秒操作数
}

/** 基准测试结果 */
export interface BenchResult {
  name: string;
  iterations: number;
  rounds: number;
  /** 每秒操作数统计 */
  opsPerSec: {
    min: number;
    max: number;
    mean: number;
    median: number;
    p95: number;
    p99: number;
    stdDev: number;
  };
  /** 单次操作耗时 (纳秒) */
  nsPerOp: {
    min: number;
    max: number;
    mean: number;
    median: number;
  };
  /** 原始数据 */
  rawResults: RoundResult[];
}

/** 默认配置 */
const DEFAULT_CONFIG = {
  warmup: 1000,
  iterations: 10000,
  rounds: 10,
};

/**
 * 计算统计值
 */
function calculateStats(values: number[]): {
  min: number;
  max: number;
  mean: number;
  median: number;
  p95: number;
  p99: number;
  stdDev: number;
} {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  const min = sorted[0];
  const max = sorted[n - 1];
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const median =
    n % 2 === 0
      ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
      : sorted[Math.floor(n / 2)];
  const p95 = sorted[Math.floor(n * 0.95)];
  const p99 = sorted[Math.floor(n * 0.99)];

  // 标准差
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / n;
  const stdDev = Math.sqrt(variance);

  return { min, max, mean, median, p95, p99, stdDev };
}

/**
 * 尝试触发 GC
 */
function tryGC(): void {
  if (typeof globalThis.gc === "function") {
    globalThis.gc();
  }
}

/**
 * 运行基准测试
 */
export async function bench(
  config: BenchConfig,
  fn: () => void | Promise<void>,
): Promise<BenchResult> {
  const {
    name,
    warmup = DEFAULT_CONFIG.warmup,
    iterations = DEFAULT_CONFIG.iterations,
    rounds = DEFAULT_CONFIG.rounds,
  } = config;

  // 预热阶段
  for (let i = 0; i < warmup; i++) {
    await fn();
  }

  // GC
  tryGC();

  const rawResults: RoundResult[] = [];

  // 多轮测试
  for (let round = 0; round < rounds; round++) {
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      await fn();
    }

    const end = performance.now();
    const duration = end - start;
    const opsPerSec = (iterations / duration) * 1000;

    rawResults.push({
      duration,
      ops: iterations,
      opsPerSec,
    });

    // 每轮之间 GC
    tryGC();
  }

  // 计算统计值
  const opsPerSecValues = rawResults.map((r) => r.opsPerSec);
  const opsPerSecStats = calculateStats(opsPerSecValues);

  // 计算单次操作耗时 (纳秒)
  const nsPerOpValues = rawResults.map((r) => (r.duration / r.ops) * 1_000_000);
  const nsPerOpStats = calculateStats(nsPerOpValues);

  return {
    name,
    iterations,
    rounds,
    opsPerSec: opsPerSecStats,
    nsPerOp: {
      min: nsPerOpStats.min,
      max: nsPerOpStats.max,
      mean: nsPerOpStats.mean,
      median: nsPerOpStats.median,
    },
    rawResults,
  };
}

/**
 * 同步版本的基准测试
 */
export function benchSync(config: BenchConfig, fn: () => void): BenchResult {
  const {
    name,
    warmup = DEFAULT_CONFIG.warmup,
    iterations = DEFAULT_CONFIG.iterations,
    rounds = DEFAULT_CONFIG.rounds,
  } = config;

  // 预热阶段
  for (let i = 0; i < warmup; i++) {
    fn();
  }

  // GC
  tryGC();

  const rawResults: RoundResult[] = [];

  // 多轮测试
  for (let round = 0; round < rounds; round++) {
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      fn();
    }

    const end = performance.now();
    const duration = end - start;
    const opsPerSec = (iterations / duration) * 1000;

    rawResults.push({
      duration,
      ops: iterations,
      opsPerSec,
    });

    // 每轮之间 GC
    tryGC();
  }

  // 计算统计值
  const opsPerSecValues = rawResults.map((r) => r.opsPerSec);
  const opsPerSecStats = calculateStats(opsPerSecValues);

  // 计算单次操作耗时 (纳秒)
  const nsPerOpValues = rawResults.map((r) => (r.duration / r.ops) * 1_000_000);
  const nsPerOpStats = calculateStats(nsPerOpValues);

  return {
    name,
    iterations,
    rounds,
    opsPerSec: opsPerSecStats,
    nsPerOp: {
      min: nsPerOpStats.min,
      max: nsPerOpStats.max,
      mean: nsPerOpStats.mean,
      median: nsPerOpStats.median,
    },
    rawResults,
  };
}

/**
 * 格式化数字
 */
export function formatNumber(n: number): string {
  if (n >= 1_000_000_000) {
    return `${(n / 1_000_000_000).toFixed(2)}B`;
  }
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(2)}M`;
  }
  if (n >= 1_000) {
    return `${(n / 1_000).toFixed(2)}K`;
  }
  return n.toFixed(2);
}

/**
 * 格式化耗时 (纳秒)
 */
export function formatNs(ns: number): string {
  if (ns >= 1_000_000) {
    return `${(ns / 1_000_000).toFixed(2)}ms`;
  }
  if (ns >= 1_000) {
    return `${(ns / 1_000).toFixed(2)}µs`;
  }
  return `${ns.toFixed(2)}ns`;
}

/**
 * 打印基准测试结果
 */
export function printResult(result: BenchResult): void {
  console.log(`\n📊 ${result.name}`);
  console.log(
    `   迭代: ${formatNumber(result.iterations)} × ${result.rounds} 轮`,
  );
  console.log(`   ─────────────────────────────────────`);
  console.log(
    `   ops/sec: ${formatNumber(result.opsPerSec.mean)} (±${((result.opsPerSec.stdDev / result.opsPerSec.mean) * 100).toFixed(1)}%)`,
  );
  console.log(
    `   min: ${formatNumber(result.opsPerSec.min)} | max: ${formatNumber(result.opsPerSec.max)}`,
  );
  console.log(
    `   p50: ${formatNumber(result.opsPerSec.median)} | p95: ${formatNumber(result.opsPerSec.p95)} | p99: ${formatNumber(result.opsPerSec.p99)}`,
  );
  console.log(`   ns/op: ${formatNs(result.nsPerOp.mean)}`);
}

/**
 * 打印对比结果
 */
export function printComparison(
  baseline: BenchResult,
  target: BenchResult,
): void {
  const speedup = target.opsPerSec.mean / baseline.opsPerSec.mean;
  const direction = speedup > 1 ? "faster" : "slower";
  const emoji = speedup > 1.1 ? "🚀" : speedup < 0.9 ? "🐌" : "➡️";

  console.log(`\n${emoji} ${target.name} vs ${baseline.name}`);
  console.log(
    `   ${formatNumber(target.opsPerSec.mean)} vs ${formatNumber(baseline.opsPerSec.mean)} ops/sec`,
  );
  console.log(`   ${speedup.toFixed(2)}x ${direction}`);
}

/**
 * 基准测试套件
 */
export class BenchSuite {
  private name: string;
  private results: BenchResult[] = [];

  constructor(name: string) {
    this.name = name;
  }

  /**
   * 添加异步测试
   */
  async add(
    config: BenchConfig,
    fn: () => void | Promise<void>,
  ): Promise<this> {
    const result = await bench(config, fn);
    this.results.push(result);
    return this;
  }

  /**
   * 添加同步测试
   */
  addSync(config: BenchConfig, fn: () => void): this {
    const result = benchSync(config, fn);
    this.results.push(result);
    return this;
  }

  /**
   * 打印所有结果
   */
  print(): void {
    console.log(`\n${"=".repeat(50)}`);
    console.log(`🏁 ${this.name}`);
    console.log(`${"=".repeat(50)}`);

    // 按性能排序
    const sorted = [...this.results].sort(
      (a, b) => b.opsPerSec.mean - a.opsPerSec.mean,
    );

    sorted.forEach((result, index) => {
      const medal =
        index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "  ";
      console.log(`\n${medal} #${index + 1} ${result.name}`);
      console.log(
        `   ops/sec: ${formatNumber(result.opsPerSec.mean)} (±${((result.opsPerSec.stdDev / result.opsPerSec.mean) * 100).toFixed(1)}%)`,
      );
      console.log(`   ns/op: ${formatNs(result.nsPerOp.mean)}`);
    });

    // 对比第一名和最后一名
    if (sorted.length >= 2) {
      const fastest = sorted[0];
      const slowest = sorted[sorted.length - 1];
      const ratio = fastest.opsPerSec.mean / slowest.opsPerSec.mean;
      console.log(`\n📈 最快 vs 最慢: ${ratio.toFixed(2)}x`);
    }
  }

  /**
   * 获取结果
   */
  getResults(): BenchResult[] {
    return this.results;
  }
}
