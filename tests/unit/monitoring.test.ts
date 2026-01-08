/**
 * 监控模块测试
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Server, defineRoutes, createHandler } from "../../src";
import {
  withMonitoring,
  createMonitoredServer,
  type MonitoringConfig,
  type MonitoringMetrics,
} from "../../src/monitoring";

// 创建测试路由
function createTestRoutes() {
  return defineRoutes([
    {
      method: "GET",
      path: "/",
      handler: createHandler(() => "Hello"),
    },
    {
      method: "GET",
      path: "/slow",
      handler: createHandler(async () => {
        await new Promise((r) => setTimeout(r, 50));
        return "Slow response";
      }),
    },
    {
      method: "GET",
      path: "/error",
      handler: createHandler(() => {
        throw new Error("Test error");
      }),
    },
    {
      method: "GET",
      path: "/health",
      handler: createHandler(() => ({ status: "ok" })),
    },
    {
      method: "GET",
      path: "/users/:id",
      handler: createHandler(({ params }) => ({ id: params.id })),
    },
  ]);
}

describe("Monitoring 模块", () => {
  describe("withMonitoring 基础功能", () => {
    it("应该正确包装 Server", async () => {
      const server = new Server(createTestRoutes());
      const monitored = withMonitoring(server, { console: false });

      expect(monitored.fetch).toBeDefined();
      expect(monitored.getMonitoringStatus).toBeDefined();
      expect(monitored.getMonitoringMetrics).toBeDefined();
      expect(monitored.getPathStats).toBeDefined();
      expect(monitored.resetMonitoring).toBeDefined();
    });

    it("应该记录请求指标", async () => {
      const server = new Server(createTestRoutes());
      const monitored = withMonitoring(server, { console: false });

      await monitored.fetch(new Request("http://localhost/"));

      const status = monitored.getMonitoringStatus();
      expect(status.totalRequests).toBe(1);
      expect(status.successfulRequests).toBe(1);
      expect(status.failedRequests).toBe(0);
    });

    it("应该计算正确的错误率", async () => {
      const server = new Server(createTestRoutes());
      const monitored = withMonitoring(server, { console: false });

      // 2 成功 + 1 失败
      await monitored.fetch(new Request("http://localhost/"));
      await monitored.fetch(new Request("http://localhost/"));
      await monitored.fetch(new Request("http://localhost/not-found"));

      const status = monitored.getMonitoringStatus();
      expect(status.totalRequests).toBe(3);
      expect(status.successfulRequests).toBe(2);
      expect(status.failedRequests).toBe(1);
      expect(status.errorRate).toBeCloseTo(1 / 3, 2);
    });

    it("应该记录响应时间", async () => {
      const server = new Server(createTestRoutes());
      const monitored = withMonitoring(server, { console: false });

      await monitored.fetch(new Request("http://localhost/slow"));

      const status = monitored.getMonitoringStatus();
      expect(status.avgResponseTime).toBeGreaterThan(40);
    });
  });

  describe("百分位数统计", () => {
    it("应该正确计算 P50/P95/P99", async () => {
      const server = new Server(createTestRoutes());
      const monitored = withMonitoring(server, { console: false });

      // 发送多个请求
      for (let i = 0; i < 10; i++) {
        await monitored.fetch(new Request("http://localhost/"));
      }

      const status = monitored.getMonitoringStatus();
      expect(status.p50).toBeGreaterThanOrEqual(0);
      expect(status.p95).toBeGreaterThanOrEqual(status.p50);
      expect(status.p99).toBeGreaterThanOrEqual(status.p95);
    });

    it("P99 应该接近最大值", async () => {
      const server = new Server(createTestRoutes());
      const monitored = withMonitoring(server, { console: false });

      // 快请求
      for (let i = 0; i < 9; i++) {
        await monitored.fetch(new Request("http://localhost/"));
      }
      // 慢请求
      await monitored.fetch(new Request("http://localhost/slow"));

      const status = monitored.getMonitoringStatus();
      expect(status.p99).toBeGreaterThan(40);
    });
  });

  describe("按路径统计", () => {
    it("应该按路径分组统计", async () => {
      const server = new Server(createTestRoutes());
      const monitored = withMonitoring(server, { console: false });

      await monitored.fetch(new Request("http://localhost/"));
      await monitored.fetch(new Request("http://localhost/"));
      await monitored.fetch(new Request("http://localhost/health"));

      const status = monitored.getMonitoringStatus();
      expect(status.byPath["/"]).toBeDefined();
      expect(status.byPath["/"].count).toBe(2);
      expect(status.byPath["/health"].count).toBe(1);
    });

    it("getPathStats 应该返回单路径统计", async () => {
      const server = new Server(createTestRoutes());
      const monitored = withMonitoring(server, { console: false });

      await monitored.fetch(new Request("http://localhost/"));
      await monitored.fetch(new Request("http://localhost/"));

      const stats = monitored.getPathStats("/");
      expect(stats).toBeDefined();
      expect(stats!.count).toBe(2);
      expect(stats!.avgTime).toBeGreaterThan(0);
    });

    it("应该记录路径的 min/max 时间", async () => {
      const server = new Server(createTestRoutes());
      const monitored = withMonitoring(server, { console: false });

      await monitored.fetch(new Request("http://localhost/"));
      await monitored.fetch(new Request("http://localhost/slow"));

      const rootStats = monitored.getPathStats("/");
      const slowStats = monitored.getPathStats("/slow");

      expect(rootStats!.minTime).toBeLessThan(slowStats!.minTime);
    });
  });

  describe("采样率", () => {
    it("采样率为 0 时不应记录任何请求", async () => {
      const server = new Server(createTestRoutes());
      const monitored = withMonitoring(server, {
        console: false,
        samplingRate: 0,
      });

      for (let i = 0; i < 10; i++) {
        await monitored.fetch(new Request("http://localhost/"));
      }

      const status = monitored.getMonitoringStatus();
      expect(status.totalRequests).toBe(0);
    });

    it("采样率为 1 时应记录所有请求", async () => {
      const server = new Server(createTestRoutes());
      const monitored = withMonitoring(server, {
        console: false,
        samplingRate: 1,
      });

      for (let i = 0; i < 10; i++) {
        await monitored.fetch(new Request("http://localhost/"));
      }

      const status = monitored.getMonitoringStatus();
      expect(status.totalRequests).toBe(10);
    });
  });

  describe("路径排除", () => {
    it("应该排除指定路径", async () => {
      const server = new Server(createTestRoutes());
      const monitored = withMonitoring(server, {
        console: false,
        excludePaths: ["/health"],
      });

      await monitored.fetch(new Request("http://localhost/"));
      await monitored.fetch(new Request("http://localhost/health"));

      const status = monitored.getMonitoringStatus();
      expect(status.totalRequests).toBe(1);
      expect(status.byPath["/health"]).toBeUndefined();
    });

    it("应该支持通配符排除", async () => {
      const server = new Server(createTestRoutes());
      const monitored = withMonitoring(server, {
        console: false,
        excludePaths: ["/users/*"],
      });

      await monitored.fetch(new Request("http://localhost/"));
      await monitored.fetch(new Request("http://localhost/users/123"));

      const status = monitored.getMonitoringStatus();
      expect(status.totalRequests).toBe(1);
    });
  });

  describe("回调钩子", () => {
    it("onRequest 应该在每次请求后调用", async () => {
      const onRequest = vi.fn();
      const server = new Server(createTestRoutes());
      const monitored = withMonitoring(server, {
        console: false,
        onRequest,
      });

      await monitored.fetch(new Request("http://localhost/"));
      await monitored.fetch(new Request("http://localhost/"));

      expect(onRequest).toHaveBeenCalledTimes(2);
      expect(onRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "GET",
          path: "/",
          statusCode: 200,
        })
      );
    });

    it("onSlowRequest 应该只在慢请求时调用", async () => {
      const onSlowRequest = vi.fn();
      const server = new Server(createTestRoutes());
      const monitored = withMonitoring(server, {
        console: false,
        slowThreshold: 30,
        onSlowRequest,
      });

      await monitored.fetch(new Request("http://localhost/")); // 快
      await monitored.fetch(new Request("http://localhost/slow")); // 慢

      expect(onSlowRequest).toHaveBeenCalledTimes(1);
      expect(onSlowRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          path: "/slow",
        })
      );
    });
  });

  describe("环形缓冲区", () => {
    it("应该限制最大记录数", async () => {
      const server = new Server(createTestRoutes());
      const monitored = withMonitoring(server, {
        console: false,
        maxRecords: 5,
      });

      for (let i = 0; i < 10; i++) {
        await monitored.fetch(new Request("http://localhost/"));
      }

      const metrics = monitored.getMonitoringMetrics();
      expect(metrics.length).toBe(5);
    });

    it("应该保留最新的记录", async () => {
      const server = new Server(createTestRoutes());
      const monitored = withMonitoring(server, {
        console: false,
        maxRecords: 3,
      });

      await monitored.fetch(new Request("http://localhost/"));
      await monitored.fetch(new Request("http://localhost/health"));
      await monitored.fetch(new Request("http://localhost/slow"));
      await monitored.fetch(new Request("http://localhost/")); // 覆盖第一个

      const metrics = monitored.getMonitoringMetrics();
      expect(metrics.length).toBe(3);
      // 最早的 / 应该被覆盖，现在应该是 health, slow, /
      expect(metrics[0].path).toBe("/health");
      expect(metrics[2].path).toBe("/");
    });
  });

  describe("重置功能", () => {
    it("resetMonitoring 应该清空所有数据", async () => {
      const server = new Server(createTestRoutes());
      const monitored = withMonitoring(server, { console: false });

      await monitored.fetch(new Request("http://localhost/"));
      await monitored.fetch(new Request("http://localhost/"));

      expect(monitored.getMonitoringStatus().totalRequests).toBe(2);

      monitored.resetMonitoring();

      expect(monitored.getMonitoringStatus().totalRequests).toBe(0);
      expect(monitored.getMonitoringMetrics().length).toBe(0);
    });
  });

  describe("禁用监控", () => {
    it("enabled: false 时不应记录", async () => {
      const server = new Server(createTestRoutes());
      const monitored = withMonitoring(server, {
        console: false,
        enabled: false,
      });

      await monitored.fetch(new Request("http://localhost/"));

      const status = monitored.getMonitoringStatus();
      expect(status.totalRequests).toBe(0);
    });
  });

  describe("createMonitoredServer 便捷函数", () => {
    it("应该创建带监控的 Server", async () => {
      const monitored = createMonitoredServer(Server, createTestRoutes(), {
        console: false,
      });

      await monitored.fetch(new Request("http://localhost/"));

      expect(monitored.getMonitoringStatus().totalRequests).toBe(1);
    });
  });

  describe("内存使用", () => {
    it("应该返回内存信息", async () => {
      const server = new Server(createTestRoutes());
      const monitored = withMonitoring(server, { console: false });

      await monitored.fetch(new Request("http://localhost/"));

      const status = monitored.getMonitoringStatus();
      expect(status.memoryUsage.heapUsed).toMatch(/MB$/);
      expect(status.memoryUsage.heapTotal).toMatch(/MB$/);
    });
  });

  describe("指标字段", () => {
    it("应该包含所有必要字段", async () => {
      const server = new Server(createTestRoutes());
      const monitored = withMonitoring(server, { console: false });

      await monitored.fetch(new Request("http://localhost/"));

      const metrics = monitored.getMonitoringMetrics();
      expect(metrics[0]).toMatchObject({
        requestId: expect.stringMatching(/^req_/),
        method: "GET",
        path: "/",
        statusCode: 200,
        totalTime: expect.any(Number),
        timestamp: expect.any(Number),
        memoryUsage: {
          heapUsed: expect.any(Number),
          heapTotal: expect.any(Number),
        },
      });
    });
  });

  describe("边界情况", () => {
    it("空数据时应返回合理的默认值", () => {
      const server = new Server(createTestRoutes());
      const monitored = withMonitoring(server, { console: false });

      const status = monitored.getMonitoringStatus();
      expect(status.totalRequests).toBe(0);
      expect(status.avgResponseTime).toBe(0);
      expect(status.p50).toBe(0);
      expect(status.p95).toBe(0);
      expect(status.p99).toBe(0);
      expect(status.errorRate).toBe(0);
    });

    it("getPathStats 不存在的路径应返回 undefined", () => {
      const server = new Server(createTestRoutes());
      const monitored = withMonitoring(server, { console: false });

      const stats = monitored.getPathStats("/not-exist");
      expect(stats).toBeUndefined();
    });
  });

  describe("时间窗口统计", () => {
    it("应该返回时间窗口统计", async () => {
      const server = new Server(createTestRoutes());
      const monitored = withMonitoring(server, { console: false });

      await monitored.fetch(new Request("http://localhost/"));
      await monitored.fetch(new Request("http://localhost/"));

      const status = monitored.getMonitoringStatus();
      expect(status.timeWindows.last1min.requests).toBe(2);
      expect(status.timeWindows.last5min.requests).toBe(2);
      expect(status.timeWindows.last1hour.requests).toBe(2);
    });

    it("getTimeWindowStats 应该支持自定义时间窗口", async () => {
      const server = new Server(createTestRoutes());
      const monitored = withMonitoring(server, { console: false });

      await monitored.fetch(new Request("http://localhost/"));

      const stats = monitored.getTimeWindowStats(30000); // 30秒
      expect(stats.requests).toBe(1);
      expect(stats.avgTime).toBeGreaterThan(0);
    });

    it("时间窗口应该包含 RPS", async () => {
      const server = new Server(createTestRoutes());
      const monitored = withMonitoring(server, { console: false });

      await monitored.fetch(new Request("http://localhost/"));

      const status = monitored.getMonitoringStatus();
      expect(status.timeWindows.last1min.rps).toBeDefined();
      expect(typeof status.timeWindows.last1min.rps).toBe("number");
    });
  });

  describe("RPS 计算", () => {
    it("getRPS 应该返回当前 RPS", async () => {
      const server = new Server(createTestRoutes());
      const monitored = withMonitoring(server, { console: false });

      await monitored.fetch(new Request("http://localhost/"));
      await monitored.fetch(new Request("http://localhost/"));

      const rps = monitored.getRPS();
      expect(typeof rps).toBe("number");
      expect(rps).toBeGreaterThanOrEqual(0);
    });

    it("状态中应该包含 RPS", async () => {
      const server = new Server(createTestRoutes());
      const monitored = withMonitoring(server, { console: false });

      await monitored.fetch(new Request("http://localhost/"));

      const status = monitored.getMonitoringStatus();
      expect(status.rps).toBeDefined();
      expect(typeof status.rps).toBe("number");
    });
  });

  describe("状态码分布", () => {
    it("应该统计状态码分布", async () => {
      const server = new Server(createTestRoutes());
      const monitored = withMonitoring(server, { console: false });

      // 2xx
      await monitored.fetch(new Request("http://localhost/"));
      await monitored.fetch(new Request("http://localhost/"));
      // 4xx
      await monitored.fetch(new Request("http://localhost/not-found"));

      const status = monitored.getMonitoringStatus();
      expect(status.statusCodes["2xx"]).toBe(2);
      expect(status.statusCodes["4xx"]).toBe(1);
    });

    it("应该包含详细状态码统计", async () => {
      const server = new Server(createTestRoutes());
      const monitored = withMonitoring(server, { console: false });

      await monitored.fetch(new Request("http://localhost/"));
      await monitored.fetch(new Request("http://localhost/not-found"));

      const status = monitored.getMonitoringStatus();
      expect(status.statusCodes.detail[200]).toBe(1);
      expect(status.statusCodes.detail[404]).toBe(1);
    });

    it("getStatusCodeDistribution 应该单独返回分布", async () => {
      const server = new Server(createTestRoutes());
      const monitored = withMonitoring(server, { console: false });

      await monitored.fetch(new Request("http://localhost/"));

      const dist = monitored.getStatusCodeDistribution();
      expect(dist["2xx"]).toBe(1);
      expect(dist.detail[200]).toBe(1);
    });
  });

  describe("运行时间", () => {
    it("应该返回 uptime", async () => {
      const server = new Server(createTestRoutes());
      const monitored = withMonitoring(server, { console: false });

      // 等待一小段时间确保 uptime > 0
      await new Promise((r) => setTimeout(r, 10));
      await monitored.fetch(new Request("http://localhost/"));

      const status = monitored.getMonitoringStatus();
      expect(status.uptime).toBeGreaterThanOrEqual(0);
      expect(typeof status.uptime).toBe("number");
    });
  });
});
