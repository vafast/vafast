/**
 * 原生监控模块（零外部依赖）
 *
 * 特性：
 * - P50/P95/P99 百分位数统计
 * - 按路径分组统计
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

/** 监控状态 */
export interface MonitoringStatus {
  enabled: boolean;
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
  resetMonitoring(): void;
}

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
      // 环形缓冲区已满，需要按顺序重组
      const start = head % capacity;
      return [...buffer.slice(start), ...buffer.slice(0, start)];
    },

    getSize: () => size,

    clear() {
      head = 0;
      size = 0;
    },

    /** 获取最近 n 条 */
    recent(n: number): T[] {
      const arr = this.toArray();
      return arr.slice(-n);
    },
  };
}

// ========== 工具函数 ==========

/** 生成请求 ID */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/** 获取内存使用情况 */
function getMemoryInfo(): MemoryInfo {
  if (typeof process !== "undefined" && process.memoryUsage) {
    const mem = process.memoryUsage();
    return { heapUsed: mem.heapUsed, heapTotal: mem.heapTotal };
  }
  return { heapUsed: 0, heapTotal: 0 };
}

/** 格式化内存大小 */
function formatMemory(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(2) + "MB";
}

/** 计算百分位数 */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/** 检查路径是否应该排除 */
function shouldExclude(path: string, excludePaths: string[]): boolean {
  return excludePaths.some(
    (p) => path === p || path.startsWith(p + "/") || p.endsWith("*") && path.startsWith(p.slice(0, -1))
  );
}

// ========== 监控状态管理 ==========

function createMonitorState(config: Required<MonitoringConfig>) {
  const buffer = createRingBuffer<MonitoringMetrics>(config.maxRecords);
  const pathStats = new Map<string, PathStats>();

  return {
    /** 添加指标 */
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

    /** 获取所有指标 */
    getMetrics: () => buffer.toArray(),

    /** 获取路径统计 */
    getPathStats: (path: string) => pathStats.get(path),

    /** 重置 */
    reset() {
      buffer.clear();
      pathStats.clear();
    },

    /** 获取状态 */
    getStatus(): MonitoringStatus {
      const metrics = buffer.toArray();
      const total = metrics.length;

      if (total === 0) {
        return {
          enabled: config.enabled,
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
          byPath: {},
          memoryUsage: {
            heapUsed: formatMemory(0),
            heapTotal: formatMemory(0),
          },
          recentRequests: [],
        };
      }

      const successful = metrics.filter((m) => m.statusCode < 400).length;
      const failed = total - successful;

      // 计算时间统计
      const times = metrics.map((m) => m.totalTime);
      const sortedTimes = [...times].sort((a, b) => a - b);
      const avgTime = times.reduce((a, b) => a + b, 0) / total;

      // 内存信息
      const mem = getMemoryInfo();

      // 路径统计转换
      const byPath: Record<string, PathStats> = {};
      pathStats.forEach((stats, path) => {
        byPath[path] = { ...stats, minTime: stats.minTime === Infinity ? 0 : stats.minTime };
      });

      return {
        enabled: config.enabled,
        totalRequests: total,
        successfulRequests: successful,
        failedRequests: failed,
        errorRate: failed / total,
        avgResponseTime: Number(avgTime.toFixed(2)),
        p50: Number(percentile(sortedTimes, 50).toFixed(2)),
        p95: Number(percentile(sortedTimes, 95).toFixed(2)),
        p99: Number(percentile(sortedTimes, 99).toFixed(2)),
        minTime: Number(sortedTimes[0].toFixed(2)),
        maxTime: Number(sortedTimes[sortedTimes.length - 1].toFixed(2)),
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

/** 默认配置 */
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
 * // 获取监控状态
 * const status = monitored.getMonitoringStatus()
 * console.log(`P99: ${status.p99}ms`)
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

  // 带监控的 fetch
  const monitoredFetch = async (req: Request): Promise<Response> => {
    if (!finalConfig.enabled) {
      return originalFetch(req);
    }

    const { pathname } = new URL(req.url);

    // 检查是否排除
    if (shouldExclude(pathname, finalConfig.excludePaths)) {
      return originalFetch(req);
    }

    // 采样率检查
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

      // 回调
      finalConfig.onRequest(metrics);
      if (totalTime > finalConfig.slowThreshold) {
        finalConfig.onSlowRequest(metrics);
      }
    }
  };

  // 返回增强的 Server
  return {
    ...server,
    fetch: monitoredFetch,
    getMonitoringStatus: state.getStatus,
    getMonitoringMetrics: state.getMetrics,
    getPathStats: state.getPathStats,
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
