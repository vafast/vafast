/**
 * 原生监控装饰器
 *
 * 通过装饰器模式为 Server 添加监控能力，完全不入侵原类
 * 使用函数式风格，避免 class
 */

import type { Server } from "../server";

// ========== 类型定义 ==========

/** 监控配置 */
export interface MonitoringConfig {
  /** 是否启用监控 */
  enabled?: boolean;
  /** 是否输出到控制台 */
  console?: boolean;
  /** 慢请求阈值（毫秒） */
  slowThreshold?: number;
  /** 最大记录数 */
  maxRecords?: number;
  /** 自定义标签 */
  tags?: Record<string, string>;
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

/** 监控状态 */
export interface MonitoringStatus {
  enabled: boolean;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  errorRate: number;
  avgResponseTime: string;
  memoryUsage: {
    heapUsed: string;
    heapTotal: string;
    external: string;
  } | { message: string };
  recentRequests: MonitoringMetrics[];
}

/** 带监控的 Server */
export interface MonitoredServer extends Server {
  getMonitoringStatus(): MonitoringStatus;
  getMonitoringMetrics(): MonitoringMetrics[];
  resetMonitoring(): void;
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

/** 获取格式化的内存信息 */
function getFormattedMemory() {
  if (typeof process !== "undefined" && process.memoryUsage) {
    const mem = process.memoryUsage();
    return {
      heapUsed: formatMemory(mem.heapUsed),
      heapTotal: formatMemory(mem.heapTotal),
      external: formatMemory(mem.external),
    };
  }
  return { message: "Memory info unavailable" };
}

// ========== 监控状态管理（闭包实现） ==========

function createMonitorState(config: Required<MonitoringConfig>) {
  let metrics: MonitoringMetrics[] = [];

  return {
    /** 添加指标 */
    addMetrics(m: MonitoringMetrics) {
      metrics.push(m);
      // 保持最大记录数
      if (metrics.length > config.maxRecords) {
        metrics = metrics.slice(-config.maxRecords);
      }
    },

    /** 获取所有指标 */
    getMetrics: () => metrics,

    /** 重置 */
    reset() {
      metrics = [];
    },

    /** 获取状态 */
    getStatus(): MonitoringStatus {
      const total = metrics.length;
      const successful = metrics.filter((m) => m.statusCode < 400).length;
      const failed = total - successful;
      const avgTime =
        total > 0
          ? metrics.reduce((sum, m) => sum + m.totalTime, 0) / total
          : 0;

      return {
        enabled: config.enabled,
        totalRequests: total,
        successfulRequests: successful,
        failedRequests: failed,
        errorRate: total > 0 ? failed / total : 0,
        avgResponseTime: avgTime.toFixed(2) + "ms",
        memoryUsage: getFormattedMemory(),
        recentRequests: metrics.slice(-5),
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

  if (metrics.totalTime > slowThreshold) {
    console.warn(
      `🐌 Slow request: ${metrics.path} took ${metrics.totalTime.toFixed(2)}ms`
    );
  }
}

// ========== 主函数 ==========

/** 默认配置 */
const defaultConfig: Required<MonitoringConfig> = {
  enabled: true,
  console: true,
  slowThreshold: 1000,
  maxRecords: 1000,
  tags: { framework: "vafast" },
};

/**
 * 为 Server 添加监控能力
 *
 * @example
 * ```ts
 * const server = new Server(routes)
 * const monitored = withMonitoring(server, { slowThreshold: 500 })
 *
 * // 获取监控状态
 * monitored.getMonitoringStatus()
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
      tags: finalConfig.tags,
    });
  }

  // 带监控的 fetch
  const monitoredFetch = async (req: Request): Promise<Response> => {
    if (!finalConfig.enabled) {
      return originalFetch(req);
    }

    const startTime = performance.now();
    const requestId = generateRequestId();
    const { pathname } = new URL(req.url);
    const method = req.method;

    let statusCode = 500;
    try {
      const response = await originalFetch(req);
      statusCode = response.status;
      return response;
    } finally {
      const metrics: MonitoringMetrics = {
        requestId,
        method,
        path: pathname,
        statusCode,
        totalTime: performance.now() - startTime,
        timestamp: Date.now(),
        memoryUsage: getMemoryInfo(),
      };

      state.addMetrics(metrics);
      logRequest(metrics, finalConfig.slowThreshold, finalConfig.console);
    }
  };

  // 返回增强的 Server
  return {
    ...server,
    fetch: monitoredFetch,
    getMonitoringStatus: state.getStatus,
    getMonitoringMetrics: state.getMetrics,
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
