import { Server } from "../../src/server";
import type { NestedRoute } from "../../src/types";

// 模拟中间件函数
const requireAuth = (options: { role?: string } = {}) => {
  return async (req: Request, next: () => Promise<Response>) => {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "未授权访问" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 这里可以添加角色验证逻辑
    if (options.role && options.role === "admin") {
      // 验证管理员权限
      console.log("验证管理员权限");
    }

    return next();
  };
};

const rateLimit = (options: { max: number; window: string }) => {
  return async (req: Request, next: () => Promise<Response>) => {
    console.log(`应用限流: ${options.max} 请求/${options.window}`);
    return next();
  };
};

const cors = () => {
  return async (req: Request, next: () => Promise<Response>) => {
    console.log("应用CORS中间件");
    const response = await next();
    response.headers.set("Access-Control-Allow-Origin", "*");
    return response;
  };
};

const jsonParser = () => {
  return async (req: Request, next: () => Promise<Response>) => {
    console.log("应用JSON解析中间件");
    return next();
  };
};

const errorHandler = () => {
  return async (req: Request, next: () => Promise<Response>) => {
    try {
      return await next();
    } catch (error) {
      console.error("错误处理中间件捕获到错误:", error);
      return new Response(JSON.stringify({ error: "内部服务器错误" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  };
};

const versionCheck = (version: string) => {
  return async (req: Request, next: () => Promise<Response>) => {
    console.log(`检查API版本: ${version}`);
    return next();
  };
};

const auditLog = () => {
  return async (req: Request, next: () => Promise<Response>) => {
    console.log("审计日志中间件");
    return next();
  };
};

const cache = (options: { ttl: string }) => {
  return async (req: Request, next: () => Promise<Response>) => {
    console.log(`应用缓存中间件: TTL ${options.ttl}`);
    return next();
  };
};

// 处理器函数
const adminDashboardHandler = async (req: Request) => {
  return new Response(
    JSON.stringify({
      message: "管理员仪表板",
      data: { users: 150, orders: 1200, revenue: 50000 },
    }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );
};

const getUsersHandler = async (req: Request) => {
  return new Response(
    JSON.stringify({
      message: "获取用户列表",
      data: [
        { id: 1, name: "张三", email: "zhangsan@example.com" },
        { id: 2, name: "李四", email: "lisi@example.com" },
      ],
    }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );
};

// 嵌套路由配置
const routes: NestedRoute[] = [
  {
    path: "/admin", // 父路由，只是分组
    middleware: [requireAuth({ role: "admin" }), rateLimit({ max: 100, window: "1m" })],
    children: [
      {
        path: "/dashboard", // 实际路径: /admin/dashboard
        method: "GET",
        handler: adminDashboardHandler,
        middleware: [auditLog()], // 额外添加的中间件
      },
      {
        path: "/users", // 实际路径: /admin/users
        method: "GET",
        handler: getUsersHandler,
        // 继承父路由的中间件：requireAuth + rateLimit
      },
    ],
  },
  {
    path: "/api",
    middleware: [cors(), jsonParser(), errorHandler()],
    children: [
      {
        path: "/v1",
        middleware: [versionCheck("v1"), rateLimit({ max: 1000, window: "1m" })],
        children: [
          {
            path: "/users", // 实际路径: /api/v1/users
            method: "GET",
            handler: getUsersHandler,
            middleware: [cache({ ttl: "5m" })],
            // 继承的中间件链：cors + jsonParser + errorHandler + versionCheck + rateLimit + cache
          },
        ],
      },
    ],
  },
];

// 创建服务器实例
const server = new Server(routes);

// 启动服务器
const port = 3000;
console.log(`🚀 服务器启动在端口 ${port}`);
console.log("📝 测试路由:");
console.log("  GET /admin/dashboard - 管理员仪表板");
console.log("  GET /admin/users - 获取用户列表");
console.log("  GET /api/v1/users - API v1 获取用户列表");
console.log("");

// 模拟请求测试
async function testRoutes() {
  console.log("🧪 测试路由...");

  // 测试 /admin/dashboard
  const dashboardReq = new Request(`http://localhost:${port}/admin/dashboard`, {
    method: "GET",
    headers: { Authorization: "Bearer admin-token" },
  });

  try {
    const dashboardRes = await server.fetch(dashboardReq);
    console.log(`✅ /admin/dashboard: ${dashboardRes.status}`);
  } catch (error) {
    console.error(`❌ /admin/dashboard:`, error);
  }

  // 测试 /admin/users
  const usersReq = new Request(`http://localhost:${port}/admin/users`, {
    method: "GET",
    headers: { Authorization: "Bearer admin-token" },
  });

  try {
    const usersRes = await server.fetch(usersReq);
    console.log(`✅ /admin/users: ${usersRes.status}`);
  } catch (error) {
    console.error(`❌ /admin/users:`, error);
  }

  // 测试 /api/v1/users
  const apiUsersReq = new Request(`http://localhost:${port}/api/v1/users`, {
    method: "GET",
  });

  try {
    const apiUsersRes = await server.fetch(apiUsersReq);
    console.log(`✅ /api/v1/users: ${apiUsersRes.status}`);
  } catch (error) {
    console.error(`❌ /api/v1/users:`, error);
  }
}

// 运行测试
testRoutes();

export { server };
