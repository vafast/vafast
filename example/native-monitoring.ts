import { Type } from "@sinclair/typebox";
import { Server, json, withExtra } from "../src/index";
import { withMonitoring } from "../src/monitoring";
import type { Route } from "../src/types";

// 定义验证Schema
const UserSchema = Type.Object({
  name: Type.String({ minLength: 2, maxLength: 50 }),
  age: Type.Number({ minimum: 0, maximum: 150 }),
  email: Type.String({ format: "email" }),
});

// 创建路由
const routes: Route[] = [
  // 用户创建 - 带验证
  {
    method: "POST",
    path: "/users",
    handler: withExtra()(
      {
        body: UserSchema,
      },
      async ({ body }) => {
        // 模拟处理延迟
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 100));

        return json({
          success: true,
          message: "用户创建成功",
          user: body,
        });
      }
    ),
  },

  // 用户列表
  {
    method: "GET",
    path: "/users",
    handler: async () => {
      // 模拟处理延迟
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 200));

      return json({
        success: true,
        message: "用户列表获取成功",
        users: [
          { id: 1, name: "张三", age: 25, email: "zhangsan@example.com" },
          { id: 2, name: "李四", age: 30, email: "lisi@example.com" },
        ],
      });
    },
  },

  // 慢接口 - 用于测试性能监控
  {
    method: "GET",
    path: "/slow",
    handler: async () => {
      // 模拟慢请求
      await new Promise((resolve) => setTimeout(resolve, 2000));

      return json({
        success: true,
        message: "慢请求完成",
        timestamp: new Date().toISOString(),
      });
    },
  },

  // 错误接口 - 用于测试错误监控
  {
    method: "GET",
    path: "/error",
    handler: async () => {
      // 模拟随机错误
      if (Math.random() > 0.5) {
        throw new Error("随机错误");
      }

      return json({
        success: true,
        message: "请求成功",
      });
    },
  },

  // 监控状态查看接口
  {
    method: "GET",
    path: "/monitoring/status",
    handler: async () => {
      return json({
        success: true,
        data: monitoredServer.getMonitoringStatus(),
        timestamp: new Date().toISOString(),
      });
    },
  },

  {
    method: "GET",
    path: "/monitoring/metrics",
    handler: async () => {
      return json({
        success: true,
        data: monitoredServer.getMonitoringMetrics(),
        timestamp: new Date().toISOString(),
      });
    },
  },

  {
    method: "POST",
    path: "/monitoring/reset",
    handler: async () => {
      monitoredServer.resetMonitoring();
      return json({
        success: true,
        message: "监控数据已重置",
        timestamp: new Date().toISOString(),
      });
    },
  },
];

// 创建服务器
const server = new Server(routes);

// 🎯 原生监控：一行代码启用，不入侵原 Server 类！
const monitoredServer = withMonitoring(server, {
  console: true, // 启用控制台输出
  slowThreshold: 500, // 500ms慢请求阈值
  errorThreshold: 0.1, // 10%错误率阈值
  tags: {
    environment: "development",
    service: "user-api-native",
  },
});

console.log("🚀 原生监控示例服务器启动");
console.log("📋 可用端点:");
console.log("  POST /users    - 创建用户（带验证）");
console.log("  GET  /users    - 获取用户列表");
console.log("  GET  /slow     - 慢请求测试");
console.log("  GET  /error    - 错误测试");
console.log("");
console.log("📊 监控端点:");
console.log("  GET  /monitoring/status   - 监控状态");
console.log("  GET  /monitoring/metrics  - 监控指标");
console.log("  POST /monitoring/reset    - 重置监控");
console.log("");
console.log("🎯 原生监控特性:");
console.log("  ✅ 零入侵: 不修改原 Server 类");
console.log("  ✅ 高性能: 直接操作，无包装层");
console.log("  ✅ 一行启用: withMonitoring(server, config)");
console.log("  ✅ 自动监控: 每个请求自动收集指标");
console.log("  ✅ 实时输出: 控制台显示性能数据");
console.log("  ✅ 内存友好: 保持最近1000条记录");
console.log("");
console.log("💡 监控数据会自动显示在控制台:");
console.log("   ✅ POST /users - 200 (⚡ 123.45ms)");
console.log("   🐌 慢请求警告: /slow 耗时 2000.00ms");
console.log("   ❌ GET /error - 500 (⚡ 45.67ms)");
console.log("");
console.log("🔧 测试命令:");
console.log("   curl http://localhost:3000/users");
console.log("   curl http://localhost:3000/slow");
console.log("   curl http://localhost:3000/error");
console.log("   curl http://localhost:3000/monitoring/status");

export default {
  fetch: (req: Request) => monitoredServer.fetch(req),
};
