// examples/auth-example.ts
import { Server } from "../src/index";
import {
  createAuth,
  createRoleAuth,
  createPermissionAuth,
} from "../src/middleware/auth";
import {
  generateToken,
  createTokenPair,
  refreshToken,
  type TokenPayload,
} from "../src/auth/token";

// 模拟用户数据
const users = [
  {
    id: "1",
    username: "admin",
    password: "admin123",
    role: "admin",
    permissions: ["read", "write", "delete", "admin"],
  },
  {
    id: "2",
    username: "user",
    password: "user123",
    role: "user",
    permissions: ["read", "write"],
  },
  {
    id: "3",
    username: "guest",
    password: "guest123",
    role: "guest",
    permissions: ["read"],
  },
];

const SECRET_KEY = "your-super-secret-key-change-in-production";

// 创建认证中间件
const auth = createAuth({ secret: SECRET_KEY });
const adminAuth = createRoleAuth(["admin"], { secret: SECRET_KEY });
const writePermissionAuth = createPermissionAuth(["write"], {
  secret: SECRET_KEY,
});

// 登录路由
const loginRoute = {
  method: "POST",
  path: "/login",
  handler: async (req: Request) => {
    try {
      const { username, password } = await req.json();

      const user = users.find(
        (u) => u.username === username && u.password === password
      );
      if (!user) {
        return new Response(JSON.stringify({ error: "用户名或密码错误" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 创建令牌对
      const payload: TokenPayload = {
        userId: user.id,
        username: user.username,
        role: user.role,
        permissions: user.permissions,
      };

      const tokenPair = await createTokenPair(payload, SECRET_KEY, {
        expiresIn: 3600, // 访问令牌1小时过期
        issuer: "vafast-api",
        audience: "web-app",
      });

      return new Response(
        JSON.stringify({
          message: "登录成功",
          accessToken: tokenPair.accessToken.token,
          refreshToken: tokenPair.refreshToken.token,
          expiresIn: 3600,
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
            permissions: user.permissions,
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      return new Response(JSON.stringify({ error: "登录失败" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};

// 刷新令牌路由
const refreshRoute = {
  method: "POST",
  path: "/refresh",
  handler: async (req: Request) => {
    try {
      const { refreshToken: refreshTokenStr } = await req.json();

      if (!refreshTokenStr) {
        return new Response(JSON.stringify({ error: "缺少刷新令牌" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const newToken = await refreshToken(refreshTokenStr, SECRET_KEY, {
        expiresIn: 3600,
      });

      if (!newToken) {
        return new Response(JSON.stringify({ error: "刷新令牌无效" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          message: "令牌刷新成功",
          accessToken: newToken.token,
          expiresIn: 3600,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      return new Response(JSON.stringify({ error: "令牌刷新失败" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};

// 受保护的用户信息路由
const userProfileRoute = {
  method: "GET",
  path: "/profile",
  handler: async (req: Request) => {
    // 用户信息通过中间件注入到 req.user
    const user = (req as any).user;

    return new Response(
      JSON.stringify({
        message: "获取用户信息成功",
        user: {
          id: user.userId,
          username: user.username,
          role: user.role,
          permissions: user.permissions,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  },
  middleware: [auth],
};

// 管理员专用路由
const adminRoute = {
  method: "GET",
  path: "/admin",
  handler: async (req: Request) => {
    const user = (req as any).user;

    return new Response(
      JSON.stringify({
        message: "管理员面板",
        user: {
          id: user.userId,
          username: user.username,
          role: user.role,
        },
        adminFeatures: ["用户管理", "系统配置", "日志查看"],
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  },
  middleware: [adminAuth],
};

// 需要写权限的路由
const writeRoute = {
  method: "POST",
  path: "/data",
  handler: async (req: Request) => {
    const user = (req as any).user;
    const body = await req.json();

    return new Response(
      JSON.stringify({
        message: "数据写入成功",
        user: {
          id: user.userId,
          username: user.username,
        },
        data: body,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  },
  middleware: [writePermissionAuth],
};

// 公开路由
const publicRoute = {
  method: "GET",
  path: "/public",
  handler: async () => {
    return new Response(
      JSON.stringify({
        message: "这是公开信息",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  },
};

// 创建服务器
const server = new Server([
  loginRoute,
  refreshRoute,
  userProfileRoute,
  adminRoute,
  writeRoute,
  publicRoute,
]);

// 启动服务器
// 注意：这个示例需要在 Bun 环境中运行
// 使用命令: npx tsx examples/auth-example.ts
console.log("🚀 认证示例服务器");
console.log("\n📋 可用路由:");
console.log("POST /login - 用户登录");
console.log("POST /refresh - 刷新令牌");
console.log("GET /profile - 获取用户信息 (需要认证)");
console.log("GET /admin - 管理员面板 (需要admin角色)");
console.log("POST /data - 写入数据 (需要write权限)");
console.log("GET /public - 公开信息");

console.log("\n👥 测试用户:");
console.log("admin/admin123 - 管理员");
console.log("user/user123 - 普通用户");
console.log("guest/guest123 - 访客");

console.log("\n💡 使用方法:");
console.log("1. 启动服务器: npx tsx examples/auth-example.ts");
console.log("2. 测试 API 端点");
console.log("3. 使用 Postman 或 curl 测试认证流程");

export { server };
