/**
 * 原生监控装饰器
 *
 * 通过装饰器模式为 Server 添加监控能力，完全不入侵原类
 *
 * @author Framework Team
 * @version 2.0.0
 * @license MIT
 */

import type { Server } from "../server";

// 监控配置接口
export interface NativeMonitoringConfig {
  enabled?: boolean;
  console?: boolean;
  slowThreshold?: number; // 毫秒
  errorThreshold?: number;
  tags?: Record<string, string>;
}

// 监控指标接口
export interface NativeMonitoringMetrics {
  requestId: string;
  method: string;
  path: string;
  statusCode: number;
  totalTime: number;
  timestamp: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
  };
}

// 带监控的 Server 接口
export interface MonitoredServer extends Server {
  // 监控相关方法
  getMonitoringStatus(): any;
  getMonitoringMetrics(): NativeMonitoringMetrics[];
  resetMonitoring(): void;

  // 原始方法保持不变
  fetch: (req: Request) => Promise<Response>;
  use: (mw: any) => void;
}

// 原生监控器
class NativeMonitor {
  private config: NativeMonitoringConfig;
  private metrics: NativeMonitoringMetrics[] = [];
  private isEnabled = false;

  constructor(config: NativeMonitoringConfig = {}) {
    this.config = {
      enabled: true,
      console: true,
      slowThreshold: 1000,
      errorThreshold: 0.05,
      tags: { framework: "vafast" },
      ...config,
    };

    this.isEnabled = this.config.enabled ?? true;

    if (this.isEnabled && this.config.console) {
      console.log("✅ 原生监控已启用");
      console.log(`📊 监控配置:`, {
        慢请求阈值: `${this.config.slowThreshold}ms`,
        错误率阈值: `${(this.config.errorThreshold! * 100).toFixed(1)}%`,
        标签: this.config.tags,
      });
    }
  }

  // 记录监控指标
  recordMetrics(metrics: NativeMonitoringMetrics): void {
    if (!this.isEnabled) return;

    this.metrics.push(metrics);

    // 保持最近1000条记录
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // 控制台输出
    if (this.config.console) {
      const status = metrics.statusCode < 400 ? "✅" : "❌";
      const timeColor =
        metrics.totalTime > this.config.slowThreshold! ? "🐌" : "⚡";

      console.log(
        `${status} ${metrics.method} ${metrics.path} - ${
          metrics.statusCode
        } (${timeColor} ${metrics.totalTime.toFixed(2)}ms)`
      );

      // 慢请求警告
      if (metrics.totalTime > this.config.slowThreshold!) {
        console.warn(
          `🐌 慢请求警告: ${metrics.path} 耗时 ${metrics.totalTime.toFixed(
            2
          )}ms`
        );
      }
    }
  }

  // 获取监控状态
  getStatus() {
    if (!this.isEnabled) {
      return { enabled: false, message: "监控未启用" };
    }

    const totalRequests = this.metrics.length;
    const successfulRequests = this.metrics.filter(
      (m) => m.statusCode < 400
    ).length;
    const failedRequests = totalRequests - successfulRequests;
    const avgResponseTime =
      totalRequests > 0
        ? this.metrics.reduce((sum, m) => sum + m.totalTime, 0) / totalRequests
        : 0;

    return {
      enabled: true,
      totalRequests,
      successfulRequests,
      failedRequests,
      errorRate: totalRequests > 0 ? failedRequests / totalRequests : 0,
      avgResponseTime: avgResponseTime.toFixed(2) + "ms",
      memoryUsage: this.getMemoryUsage(),
      recentRequests: this.metrics.slice(-5),
    };
  }

  // 获取监控指标
  getMetrics() {
    return this.metrics;
  }

  // 重置监控数据
  reset() {
    this.metrics = [];
    console.log("🔄 监控数据已重置");
  }

  // 获取内存使用情况
  private getMemoryUsage() {
    if (typeof process !== "undefined" && process.memoryUsage) {
      const mem = process.memoryUsage();
      return {
        heapUsed: (mem.heapUsed / 1024 / 1024).toFixed(2) + "MB",
        heapTotal: (mem.heapTotal / 1024 / 1024).toFixed(2) + "MB",
        external: (mem.external / 1024 / 1024).toFixed(2) + "MB",
      };
    }
    return { message: "内存信息不可用" };
  }
}

// 纯函数：为 Server 添加监控能力
export function withMonitoring(
  server: Server,
  config: NativeMonitoringConfig = {}
): MonitoredServer {
  const monitor = new NativeMonitor(config);

  // 保存原始的 fetch 方法
  const originalFetch = server.fetch.bind(server);

  // 创建带监控的 fetch 方法
  const monitoredFetch = async (req: Request): Promise<Response> => {
    const startTime = performance.now();
    const requestId = `req_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const { pathname } = new URL(req.url);
    const method = req.method;

    try {
      // 调用原始 fetch
      const response = await originalFetch(req);

      // 记录监控指标
      const totalTime = performance.now() - startTime;
      monitor.recordMetrics({
        requestId,
        method,
        path: pathname,
        statusCode: response.status,
        totalTime,
        timestamp: Date.now(),
        memoryUsage: (() => {
          if (typeof process !== "undefined" && process.memoryUsage) {
            const mem = process.memoryUsage();
            return {
              heapUsed: mem.heapUsed,
              heapTotal: mem.heapTotal,
            };
          }
          return { heapUsed: 0, heapTotal: 0 };
        })(),
      });

      return response;
    } catch (error) {
      // 记录错误监控指标
      const totalTime = performance.now() - startTime;
      monitor.recordMetrics({
        requestId,
        method,
        path: pathname,
        statusCode: 500,
        totalTime,
        timestamp: Date.now(),
        memoryUsage: (() => {
          if (typeof process !== "undefined" && process.memoryUsage) {
            const mem = process.memoryUsage();
            return {
              heapUsed: mem.heapUsed,
              heapTotal: mem.heapTotal,
            };
          }
          return { heapUsed: 0, heapTotal: 0 };
        })(),
      });

      throw error;
    }
  };

  // 创建带监控的 Server 对象
  const monitoredServer = {
    ...server,
    fetch: monitoredFetch,

    // 监控方法
    getMonitoringStatus: () => monitor.getStatus(),
    getMonitoringMetrics: () => monitor.getMetrics(),
    resetMonitoring: () => monitor.reset(),
  } as MonitoredServer;

  return monitoredServer;
}

// 便捷函数：创建带监控的 Server
export function createMonitoredServer(
  routes: any[],
  config?: NativeMonitoringConfig
): MonitoredServer {
  const { Server } = require("../server");
  const server = new Server(routes);
  return withMonitoring(server, config);
}
