/**
 * 原生监控模块（零外部依赖）
 *
 * 特性：
 * - P50/P95/P99 百分位数统计
 * - 按路径分组统计
 * - 时间窗口统计（1分钟/5分钟/1小时）
 * - RPS 计算（每秒请求数）
 * - 状态码分布
 * - 环形缓冲区（内存友好）
 * - 采样率控制
 * - 路径排除
 * - 自定义回调
 */

import type { Server } from "../server";

// ========== 类型定义 ==========

/** 监控配置 */
export interface MonitoringConfig {
  /** 是否启用监控，默认 true */
  enabled?: boolean;
  /** 是否输出到控制台，默认 true */
  console?: boolean;
  /** 慢请求阈值（毫秒），默认 1000 */
  slowThreshold?: number;
  /** 最大记录数，默认 1000 */
  maxRecords?: number;
  /** 采样率 0-1，默认 1（全部记录） */
  samplingRate?: number;
  /** 排除的路径（不记录） */
  excludePaths?: string[];
  /** 自定义标签 */
  tags?: Record<string, string>;
  /** 请求完成回调 */
  onRequest?: (metrics: MonitoringMetrics) => void;
  /** 慢请求回调 */
  onSlowRequest?: (metrics: MonitoringMetrics) => void;
}

/** 监控指标 */
export interface MonitoringMetrics {
  requestId: string;
  method: string;
  path: string;
  statusCode: number;
  totalTime: number;
  timestamp: number;
  memoryUsage: MemoryInfo;
}

/** 内存信息 */
export interface MemoryInfo {
  heapUsed: number;
  heapTotal: number;
}

/** 路径统计 */
export interface PathStats {
  count: number;
  totalTime: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  errorCount: number;
}

/** 时间窗口统计 */
export interface TimeWindowStats {
  /** 请求数 */
  requests: number;
  /** 成功数 */
  successful: number;
  /** 失败数 */
  failed: number;
  /** 错误率 */
  errorRate: number;
  /** 平均响应时间 */
  avgTime: number;
  /** RPS（每秒请求数） */
  rps: number;
}

/** 状态码分布 */
export interface StatusCodeDistribution {
  /** 2xx 成功 */
  "2xx": number;
  /** 3xx 重定向 */
  "3xx": number;
  /** 4xx 客户端错误 */
  "4xx": number;
  /** 5xx 服务器错误 */
  "5xx": number;
  /** 详细分布 */
  detail: Record<number, number>;
}

/** 监控状态 */
export interface MonitoringStatus {
  enabled: boolean;
  /** 服务运行时间（毫秒） */
  uptime: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  errorRate: number;
  /** 平均响应时间（毫秒） */
  avgResponseTime: number;
  /** P50 响应时间（毫秒） */
  p50: number;
  /** P95 响应时间（毫秒） */
  p95: number;
  /** P99 响应时间（毫秒） */
  p99: number;
  /** 最小响应时间 */
  minTime: number;
  /** 最大响应时间 */
  maxTime: number;
  /** 当前 RPS */
  rps: number;
  /** 状态码分布 */
  statusCodes: StatusCodeDistribution;
  /** 时间窗口统计 */
  timeWindows: {
    /** 最近 1 分钟 */
    last1min: TimeWindowStats;
    /** 最近 5 分钟 */
    last5min: TimeWindowStats;
    /** 最近 1 小时 */
    last1hour: TimeWindowStats;
  };
  /** 按路径统计 */
  byPath: Record<string, PathStats>;
  /** 内存使用 */
  memoryUsage: {
    heapUsed: string;
    heapTotal: string;
  };
  /** 最近请求 */
  recentRequests: MonitoringMetrics[];
}

/** 带监控的 Server */
export interface MonitoredServer extends Server {
  getMonitoringStatus(): MonitoringStatus;
  getMonitoringMetrics(): MonitoringMetrics[];
  getPathStats(path: string): PathStats | undefined;
  getTimeWindowStats(windowMs: number): TimeWindowStats;
  getRPS(): number;
  getStatusCodeDistribution(): StatusCodeDistribution;
  resetMonitoring(): void;
}

// ========== 常量 ==========

const ONE_MINUTE = 60 * 1000;
const FIVE_MINUTES = 5 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

// ========== 环形缓冲区 ==========

function createRingBuffer<T>(capacity: number) {
  const buffer: T[] = new Array(capacity);
  let head = 0;
  let size = 0;

  return {
    push(item: T) {
      buffer[head % capacity] = item;
      head++;
      if (size < capacity) size++;
    },

    toArray(): T[] {
      if (size === 0) return [];
      if (size < capacity) {
        return buffer.slice(0, size);
      }
      const start = head % capacity;
      return [...buffer.slice(start), ...buffer.slice(0, start)];
    },

    getSize: () => size,

    clear() {
      head = 0;
      size = 0;
    },

    recent(n: number): T[] {
      const arr = this.toArray();
      return arr.slice(-n);
    },
  };
}

// ========== 工具函数 ==========

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function getMemoryInfo(): MemoryInfo {
  if (typeof process !== "undefined" && process.memoryUsage) {
    const mem = process.memoryUsage();
    return { heapUsed: mem.heapUsed, heapTotal: mem.heapTotal };
  }
  return { heapUsed: 0, heapTotal: 0 };
}

function formatMemory(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(2) + "MB";
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function shouldExclude(path: string, excludePaths: string[]): boolean {
  return excludePaths.some(
    (p) =>
      path === p ||
      path.startsWith(p + "/") ||
      (p.endsWith("*") && path.startsWith(p.slice(0, -1)))
  );
}

function getStatusCodeCategory(code: number): "2xx" | "3xx" | "4xx" | "5xx" {
  if (code >= 200 && code < 300) return "2xx";
  if (code >= 300 && code < 400) return "3xx";
  if (code >= 400 && code < 500) return "4xx";
  return "5xx";
}

// ========== 监控状态管理 ==========

function createMonitorState(config: Required<MonitoringConfig>) {
  const buffer = createRingBuffer<MonitoringMetrics>(config.maxRecords);
  const pathStats = new Map<string, PathStats>();
  const startTime = Date.now();

  /** 获取时间窗口内的指标 */
  function getMetricsInWindow(windowMs: number): MonitoringMetrics[] {
    const now = Date.now();
    const cutoff = now - windowMs;
    return buffer.toArray().filter((m) => m.timestamp >= cutoff);
  }

  /** 计算时间窗口统计 */
  function calcTimeWindowStats(windowMs: number): TimeWindowStats {
    const metrics = getMetricsInWindow(windowMs);
    const count = metrics.length;

    if (count === 0) {
      return {
        requests: 0,
        successful: 0,
        failed: 0,
        errorRate: 0,
        avgTime: 0,
        rps: 0,
      };
    }

    const successful = metrics.filter((m) => m.statusCode < 400).length;
    const failed = count - successful;
    const avgTime = metrics.reduce((sum, m) => sum + m.totalTime, 0) / count;

    // 计算实际时间跨度（用于 RPS）
    const timestamps = metrics.map((m) => m.timestamp);
    const actualWindow = Math.max(...timestamps) - Math.min(...timestamps);
    const effectiveWindow = Math.max(actualWindow, 1000); // 至少 1 秒
    const rps = (count / effectiveWindow) * 1000;

    return {
      requests: count,
      successful,
      failed,
      errorRate: failed / count,
      avgTime: Number(avgTime.toFixed(2)),
      rps: Number(rps.toFixed(2)),
    };
  }

  /** 计算状态码分布 */
  function calcStatusCodeDistribution(): StatusCodeDistribution {
    const metrics = buffer.toArray();
    const dist: StatusCodeDistribution = {
      "2xx": 0,
      "3xx": 0,
      "4xx": 0,
      "5xx": 0,
      detail: {},
    };

    for (const m of metrics) {
      const category = getStatusCodeCategory(m.statusCode);
      dist[category]++;
      dist.detail[m.statusCode] = (dist.detail[m.statusCode] || 0) + 1;
    }

    return dist;
  }

  /** 计算当前 RPS（基于最近 10 秒） */
  function calcCurrentRPS(): number {
    const metrics = getMetricsInWindow(10000); // 最近 10 秒
    if (metrics.length === 0) return 0;
    return Number((metrics.length / 10).toFixed(2));
  }

  return {
    addMetrics(m: MonitoringMetrics) {
      buffer.push(m);

      // 更新路径统计
      const stats = pathStats.get(m.path) || {
        count: 0,
        totalTime: 0,
        avgTime: 0,
        minTime: Infinity,
        maxTime: 0,
        errorCount: 0,
      };

      stats.count++;
      stats.totalTime += m.totalTime;
      stats.avgTime = stats.totalTime / stats.count;
      stats.minTime = Math.min(stats.minTime, m.totalTime);
      stats.maxTime = Math.max(stats.maxTime, m.totalTime);
      if (m.statusCode >= 400) stats.errorCount++;

      pathStats.set(m.path, stats);
    },

    getMetrics: () => buffer.toArray(),

    getPathStats: (path: string) => pathStats.get(path),

    getTimeWindowStats: calcTimeWindowStats,

    getRPS: calcCurrentRPS,

    getStatusCodeDistribution: calcStatusCodeDistribution,

    reset() {
      buffer.clear();
      pathStats.clear();
    },

    getStatus(): MonitoringStatus {
      const metrics = buffer.toArray();
      const total = metrics.length;

      if (total === 0) {
        return {
          enabled: config.enabled,
          uptime: Date.now() - startTime,
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          errorRate: 0,
          avgResponseTime: 0,
          p50: 0,
          p95: 0,
          p99: 0,
          minTime: 0,
          maxTime: 0,
          rps: 0,
          statusCodes: { "2xx": 0, "3xx": 0, "4xx": 0, "5xx": 0, detail: {} },
          timeWindows: {
            last1min: { requests: 0, successful: 0, failed: 0, errorRate: 0, avgTime: 0, rps: 0 },
            last5min: { requests: 0, successful: 0, failed: 0, errorRate: 0, avgTime: 0, rps: 0 },
            last1hour: { requests: 0, successful: 0, failed: 0, errorRate: 0, avgTime: 0, rps: 0 },
          },
          byPath: {},
          memoryUsage: { heapUsed: formatMemory(0), heapTotal: formatMemory(0) },
          recentRequests: [],
        };
      }

      const successful = metrics.filter((m) => m.statusCode < 400).length;
      const failed = total - successful;

      const times = metrics.map((m) => m.totalTime);
      const sortedTimes = [...times].sort((a, b) => a - b);
      const avgTime = times.reduce((a, b) => a + b, 0) / total;

      const mem = getMemoryInfo();

      const byPath: Record<string, PathStats> = {};
      pathStats.forEach((stats, path) => {
        byPath[path] = { ...stats, minTime: stats.minTime === Infinity ? 0 : stats.minTime };
      });

      return {
        enabled: config.enabled,
        uptime: Date.now() - startTime,
        totalRequests: total,
        successfulRequests: successful,
        failedRequests: failed,
        errorRate: Number((failed / total).toFixed(4)),
        avgResponseTime: Number(avgTime.toFixed(2)),
        p50: Number(percentile(sortedTimes, 50).toFixed(2)),
        p95: Number(percentile(sortedTimes, 95).toFixed(2)),
        p99: Number(percentile(sortedTimes, 99).toFixed(2)),
        minTime: Number(sortedTimes[0].toFixed(2)),
        maxTime: Number(sortedTimes[sortedTimes.length - 1].toFixed(2)),
        rps: calcCurrentRPS(),
        statusCodes: calcStatusCodeDistribution(),
        timeWindows: {
          last1min: calcTimeWindowStats(ONE_MINUTE),
          last5min: calcTimeWindowStats(FIVE_MINUTES),
          last1hour: calcTimeWindowStats(ONE_HOUR),
        },
        byPath,
        memoryUsage: {
          heapUsed: formatMemory(mem.heapUsed),
          heapTotal: formatMemory(mem.heapTotal),
        },
        recentRequests: buffer.recent(5),
      };
    },
  };
}

// ========== 日志输出 ==========

function logRequest(
  metrics: MonitoringMetrics,
  slowThreshold: number,
  enabled: boolean
) {
  if (!enabled) return;

  const status = metrics.statusCode < 400 ? "✅" : "❌";
  const speed = metrics.totalTime > slowThreshold ? "🐌" : "⚡";

  console.log(
    `${status} ${metrics.method} ${metrics.path} - ${metrics.statusCode} (${speed} ${metrics.totalTime.toFixed(2)}ms)`
  );
}

// ========== 主函数 ==========

const defaultConfig: Required<MonitoringConfig> = {
  enabled: true,
  console: true,
  slowThreshold: 1000,
  maxRecords: 1000,
  samplingRate: 1,
  excludePaths: [],
  tags: { framework: "vafast" },
  onRequest: () => {},
  onSlowRequest: () => {},
};

/**
 * 为 Server 添加监控能力
 *
 * @example
 * ```ts
 * const server = new Server(routes)
 * const monitored = withMonitoring(server, {
 *   slowThreshold: 500,
 *   excludePaths: ['/health'],
 *   onSlowRequest: (m) => console.warn('Slow!', m.path)
 * })
 *
 * // 获取完整状态
 * const status = monitored.getMonitoringStatus()
 * console.log(`P99: ${status.p99}ms`)
 * console.log(`RPS: ${status.rps}`)
 * console.log(`Last 1min errors: ${status.timeWindows.last1min.errorRate}`)
 *
 * // 单独获取 RPS
 * console.log(`Current RPS: ${monitored.getRPS()}`)
 *
 * // 自定义时间窗口
 * const last30sec = monitored.getTimeWindowStats(30000)
 * ```
 */
export function withMonitoring(
  server: Server,
  config: MonitoringConfig = {}
): MonitoredServer {
  const finalConfig = { ...defaultConfig, ...config };
  const state = createMonitorState(finalConfig);
  const originalFetch = server.fetch.bind(server);

  if (finalConfig.enabled && finalConfig.console) {
    console.log("✅ Monitoring enabled");
    console.log(`📊 Config:`, {
      slowThreshold: `${finalConfig.slowThreshold}ms`,
      maxRecords: finalConfig.maxRecords,
      samplingRate: finalConfig.samplingRate,
      excludePaths: finalConfig.excludePaths,
    });
  }

  const monitoredFetch = async (req: Request): Promise<Response> => {
    if (!finalConfig.enabled) {
      return originalFetch(req);
    }

    const { pathname } = new URL(req.url);

    if (shouldExclude(pathname, finalConfig.excludePaths)) {
      return originalFetch(req);
    }

    if (finalConfig.samplingRate < 1 && Math.random() > finalConfig.samplingRate) {
      return originalFetch(req);
    }

    const startTime = performance.now();
    const requestId = generateRequestId();
    const method = req.method;

    let statusCode = 500;
    try {
      const response = await originalFetch(req);
      statusCode = response.status;
      return response;
    } finally {
      const totalTime = performance.now() - startTime;
      const metrics: MonitoringMetrics = {
        requestId,
        method,
        path: pathname,
        statusCode,
        totalTime,
        timestamp: Date.now(),
        memoryUsage: getMemoryInfo(),
      };

      state.addMetrics(metrics);
      logRequest(metrics, finalConfig.slowThreshold, finalConfig.console);

      finalConfig.onRequest(metrics);
      if (totalTime > finalConfig.slowThreshold) {
        finalConfig.onSlowRequest(metrics);
      }
    }
  };

  return {
    ...server,
    fetch: monitoredFetch,
    getMonitoringStatus: state.getStatus,
    getMonitoringMetrics: state.getMetrics,
    getPathStats: state.getPathStats,
    getTimeWindowStats: state.getTimeWindowStats,
    getRPS: state.getRPS,
    getStatusCodeDistribution: state.getStatusCodeDistribution,
    resetMonitoring: state.reset,
  } as MonitoredServer;
}

/**
 * 创建带监控的 Server（便捷函数）
 */
export function createMonitoredServer(
  ServerClass: typeof Server,
  routes: ConstructorParameters<typeof Server>[0],
  config?: MonitoringConfig
): MonitoredServer {
  const server = new ServerClass(routes);
  return withMonitoring(server, config);
}
