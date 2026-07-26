import {
  Server,
  defineRoute,
  defineRoutes,
  json,
  Type,
} from "../../src/index";
import {
  withMonitoring,
  type MonitoredServer,
} from "../../src/monitoring";

const UserSchema = Type.Object({
  name: Type.String({ minLength: 2, maxLength: 50 }),
  age: Type.Number({ minimum: 0, maximum: 150 }),
  email: Type.String({ format: "email" }),
});

let monitoredServer: MonitoredServer;

const routes = defineRoutes([
  defineRoute({
    method: "POST",
    path: "/users",
    schema: { body: UserSchema },
    handler: async ({ body }) => {
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 100));
      return json({
        success: true,
        message: "用户创建成功",
        user: body,
      });
    },
  }),

  defineRoute({
    method: "GET",
    path: "/users",
    handler: async () => {
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
  }),

  defineRoute({
    method: "GET",
    path: "/slow",
    handler: async () => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return json({
        success: true,
        message: "慢请求完成",
        timestamp: new Date().toISOString(),
      });
    },
  }),

  defineRoute({
    method: "GET",
    path: "/error",
    handler: async () => {
      if (Math.random() > 0.5) {
        throw new Error("随机错误");
      }
      return json({
        success: true,
        message: "请求成功",
      });
    },
  }),

  defineRoute({
    method: "GET",
    path: "/monitoring/status",
    handler: async () =>
      json({
        success: true,
        data: monitoredServer.getMonitoringStatus(),
        timestamp: new Date().toISOString(),
      }),
  }),

  defineRoute({
    method: "GET",
    path: "/monitoring/metrics",
    handler: async () =>
      json({
        success: true,
        data: monitoredServer.getMonitoringMetrics(),
        timestamp: new Date().toISOString(),
      }),
  }),

  defineRoute({
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
  }),
]);

const server = new Server(routes);

monitoredServer = withMonitoring(server, {
  console: true,
  slowThreshold: 500,
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

export default {
  fetch: (req: Request) => monitoredServer.fetch(req),
};
