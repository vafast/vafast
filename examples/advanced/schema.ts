/**
 * Schema 验证示例
 *
 * 展示 Vafast 框架的类型安全 Schema 验证功能
 *
 * @author Framework Team
 * @version 2.0.0
 * @license MIT
 */

import { Type } from "@sinclair/typebox";
import type { TypedRoute } from "../../src/types/route";
import { Server } from "../../src/server";
import { createHandler, createHandlerWithExtra } from "../../src/utils/create-handler";
import { setLocals } from "../../src/utils/handle";

// ==================== 中间件类型定义 ====================

type ApiKeyInfo = {
  sub: string;
  scopes: string[];
  issuedAt: number;
};

type UserContext = {
  userId: string;
  role: "admin" | "user";
  permissions: string[];
};

// 带额外上下文的类型定义
type AuthContext = {
  apiKeyInfo: ApiKeyInfo;
  userContext: UserContext;
};

// ==================== 中间件定义 ====================

// Logger 中间件
const logger = async (req: Request, next: () => Promise<Response>) => {
  const start = Date.now();
  const method = req.method;
  const url = req.url;

  console.log(`📥 [${new Date().toISOString()}] ${method} ${url}`);

  const response = await next();

  const duration = Date.now() - start;
  console.log(
    `📤 [${new Date().toISOString()}] ${method} ${url} → ${response.status} (${duration}ms)`
  );

  return response;
};

// 认证中间件
const requireAuth = async (req: Request, next: () => Promise<Response>) => {
  const apiKey = req.headers.get("x-api-key");

  if (!apiKey) {
    return new Response("Unauthorized: Missing API Key", { status: 401 });
  }

  const apiKeyInfo: ApiKeyInfo = {
    sub: "user_" + Math.random().toString(36).substring(2, 11),
    scopes: ["read", "write"],
    issuedAt: Date.now(),
  };

  setLocals(req, { apiKeyInfo });

  console.log(`🔐 认证成功: ${apiKeyInfo.sub}`);
  return next();
};

// 用户上下文中间件
const enrichUserContext = async (req: Request, next: () => Promise<Response>) => {
  const userContext: UserContext = {
    userId: "user_123",
    role: "admin",
    permissions: ["users:read", "users:write", "admin:all"],
  };

  setLocals(req, { userContext });

  console.log(`👤 用户上下文注入: ${userContext.role}`);
  return next();
};

// ==================== Schema 定义 ====================

const TestBodySchema = Type.Object({
  name: Type.String(),
  age: Type.Number(),
});

const TestQuerySchema = Type.Object({
  page: Type.Optional(Type.String()),
  limit: Type.Optional(Type.String()),
});

const TestParamsSchema = Type.Object({
  id: Type.String(),
  action: Type.Optional(Type.String()),
});

const TestHeadersSchema = Type.Object({
  "user-agent": Type.Optional(Type.String()),
  accept: Type.Optional(Type.String()),
});

const TestCookiesSchema = Type.Object({
  sessionId: Type.String(),
  theme: Type.Optional(Type.String()),
});

const UpdateProfileSchema = Type.Object({
  displayName: Type.String(),
  email: Type.Optional(Type.String()),
  bio: Type.Optional(Type.String()),
});

// ==================== 路由定义 ====================

const schemaTestRoutes: TypedRoute[] = [
  // POST /test/body - Body Schema 验证
  {
    method: "POST",
    path: "/test/body",
    middleware: [logger],
    handler: createHandler(
      { body: TestBodySchema },
      ({ req, body }) => {
        const userAgent = req.headers.get("user-agent");
        return {
          success: true,
          message: "Body Schema验证通过",
          data: {
            receivedBody: body,
            userAgent,
            timestamp: new Date().toISOString(),
          },
        };
      },
    ),
  },

  // GET /test/query - Query Schema 验证
  {
    method: "GET",
    path: "/test/query",
    middleware: [logger],
    handler: createHandler(
      { query: TestQuerySchema },
      ({ query }) => ({
        success: true,
        message: "Query Schema验证通过",
        data: {
          receivedQuery: query,
          timestamp: new Date().toISOString(),
        },
      }),
    ),
  },

  // GET /test/params/:id/:action - Params Schema 验证
  {
    method: "GET",
    path: "/test/params/:id/:action",
    middleware: [logger],
    handler: createHandler(
      { params: TestParamsSchema },
      ({ params }) => ({
        success: true,
        message: "Params Schema验证通过",
        data: {
          receivedParams: params,
          timestamp: new Date().toISOString(),
        },
      }),
    ),
  },

  // GET /test/headers - Headers Schema 验证
  {
    method: "GET",
    path: "/test/headers",
    middleware: [logger],
    handler: createHandler(
      { headers: TestHeadersSchema },
      ({ headers, cookies }) => ({
        success: true,
        message: "Headers Schema验证通过",
        data: {
          receivedHeaders: headers,
          receivedCookies: cookies,
          timestamp: new Date().toISOString(),
        },
      }),
    ),
  },

  // GET /test/cookies - Cookies Schema 验证
  {
    method: "GET",
    path: "/test/cookies",
    middleware: [logger],
    handler: createHandler(
      { cookies: TestCookiesSchema },
      ({ cookies }) => ({
        success: true,
        message: "Cookies Schema验证通过",
        data: {
          receivedCookies: cookies,
          timestamp: new Date().toISOString(),
        },
      }),
    ),
  },

  // POST /test/all/:id/:action - 全部 Schema 验证
  {
    method: "POST",
    path: "/test/all/:id/:action",
    middleware: [logger],
    handler: createHandler(
      {
        body: TestBodySchema,
        query: TestQuerySchema,
        params: TestParamsSchema,
        headers: TestHeadersSchema,
        cookies: TestCookiesSchema,
      },
      ({ body, query, params, headers, cookies }) => ({
        success: true,
        message: "所有Schema验证通过",
        data: {
          receivedBody: body,
          receivedQuery: query,
          receivedParams: params,
          receivedHeaders: headers,
          receivedCookies: cookies,
          timestamp: new Date().toISOString(),
        },
      }),
    ),
  },

  // GET /test/middleware-order - 中间件执行顺序测试
  {
    method: "GET",
    path: "/test/middleware-order",
    middleware: [logger],
    handler: createHandler(() => ({
      success: true,
      message: "中间件执行顺序测试",
      data: {
        timestamp: new Date().toISOString(),
      },
    })),
  },

  // POST /login - 高级返回值格式
  {
    method: "POST",
    path: "/login",
    middleware: [logger],
    handler: createHandler(() => {
      const token = `token_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      const headers = new Headers();
      headers.set("Set-Cookie", `auth=${token}; HttpOnly; Path=/; Max-Age=3600`);

      return {
        data: {
          success: true,
          message: "登录成功",
          token,
          timestamp: new Date().toISOString(),
        },
        status: 200,
        headers,
      };
    }),
  },

  // GET /admin/profile - 中间件注入类型化数据
  {
    method: "GET",
    path: "/admin/profile",
    middleware: [logger, requireAuth, enrichUserContext],
    handler: createHandlerWithExtra<AuthContext>(({ apiKeyInfo, userContext }) => ({
      success: true,
      message: "管理员资料获取成功",
      data: {
        profile: {
          userId: userContext.userId,
          role: userContext.role,
          permissions: userContext.permissions,
          apiKey: {
            sub: apiKeyInfo.sub,
            scopes: apiKeyInfo.scopes,
            issuedAt: new Date(apiKeyInfo.issuedAt).toISOString(),
          },
        },
        timestamp: new Date().toISOString(),
      },
    })),
  },

  // POST /admin/profile/update - 带 body Schema 与中间件额外类型
  {
    method: "POST",
    path: "/admin/profile/update",
    middleware: [logger, requireAuth, enrichUserContext],
    handler: createHandlerWithExtra<AuthContext>(
      { body: UpdateProfileSchema },
      ({ body, apiKeyInfo, userContext }) => ({
        data: {
          success: true,
          updated: body,
          operator: apiKeyInfo.sub,
          role: userContext.role,
          timestamp: new Date().toISOString(),
        },
        status: 200,
      }),
    ),
  },
];

// ==================== 创建服务器 ====================

const server = new Server([
  {
    method: "GET",
    path: "/health",
    handler: () => new Response("✅ OK"),
  },
  ...schemaTestRoutes,
]);

console.log("🚀 服务器配置完成!");
console.log("📡 使用 Vafast 框架");
console.log(`📋 可用路由:`);
console.log(`   GET /health`);
schemaTestRoutes.forEach((route) => {
  console.log(`   ${route.method} ${route.path}`);
});

export default {
  fetch: (req: Request) => server.fetch(req),
};
