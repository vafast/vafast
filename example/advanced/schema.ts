/**
 * 主服务器入口文件
 *
 * 使用 tirne 框架创建 HTTP 服务器
 *
 * @author Framework Team
 * @version 1.0.0
 * @license MIT
 */

import { Type } from "@sinclair/typebox";
import type { TypedRoute } from "../../src/types/route";
import { json } from "../../src/util";
import { Server } from "../../src/server";
import { createRouteHandler } from "../../src/utils/route-handler-factory";

// 简化的测试用Logger中间件
const logger = async (req: Request, next: Function) => {
  const start = Date.now();
  const method = req.method;
  const url = req.url;

  // 记录请求开始
  console.log(`📥 [${new Date().toISOString()}] ${method} ${url}`);

  // 执行下一个中间件或处理器
  const response = await next();

  // 记录响应信息
  const duration = Date.now() - start;
  const status = response.status;
  console.log(`📤 [${new Date().toISOString()}] ${method} ${url} → ${status} (${duration}ms)`);

  return response;
};

// 简化的测试用Schema定义

// Body Schema - 简单的用户数据
const TestBodySchema = Type.Object({
  name: Type.String(),
  age: Type.Number(),
});

// Query Schema - 简单的查询参数
const TestQuerySchema = Type.Object({
  page: Type.Optional(Type.String()),
  limit: Type.Optional(Type.String()),
});

// Params Schema - 简单的路径参数
const TestParamsSchema = Type.Object({
  id: Type.String(),
  action: Type.Optional(Type.String()),
});

// Headers Schema - 简单的请求头
const TestHeadersSchema = Type.Object({
  "user-agent": Type.Optional(Type.String()),
  accept: Type.Optional(Type.String()),
});

// Cookies Schema - 简单的Cookie
const TestCookiesSchema = Type.Object({
  sessionId: Type.String(),
  theme: Type.Optional(Type.String()),
});

// Schema验证测试路由配置
const schemaTestRoutes: TypedRoute[] = [
  /**
   * POST /test/body - 测试Body Schema验证
   * 验证请求体数据格式
   */
  {
    method: "POST",
    path: "/test/body",
    handler: createRouteHandler(
      {
        body: TestBodySchema,
        middleware: [logger],
      },
      ({ req, body }) => {
        // 现在可以直接使用 req，也可以解构需要的参数
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
      }
    ),
  },

  /**
   * GET /test/query - 测试Query Schema验证
   * 验证查询参数格式
   */
  {
    method: "GET",
    path: "/test/query",
    handler: createRouteHandler(
      {
        query: TestQuerySchema,
        middleware: [logger],
      },
      ({ req, query }) => {
        // 可以解构需要的参数
        return {
          success: true,
          message: "Query Schema验证通过",
          data: {
            receivedQuery: query,
            timestamp: new Date().toISOString(),
          },
        };
      }
    ),
  },

  /**
   * GET /test/params/:id/:action - 测试Params Schema验证
   * 验证路径参数格式
   */
  {
    method: "GET",
    path: "/test/params/:id/:action",
    handler: createRouteHandler(
      {
        params: TestParamsSchema,
        middleware: [logger],
      },
      ({ req, params }) => {
        // 可以解构需要的参数
        return {
          success: true,
          message: "Params Schema验证通过",
          data: {
            receivedParams: params,
            timestamp: new Date().toISOString(),
          },
        };
      }
    ),
  },

  /**
   * GET /test/headers - 测试Headers Schema验证
   * 验证请求头格式
   */
  {
    method: "GET",
    path: "/test/headers",
    handler: createRouteHandler(
      {
        headers: TestHeadersSchema,
        middleware: [logger],
      },
      ({ req, headers, cookies }) => {
        // 可以解构需要的参数
        return {
          success: true,
          message: "Headers Schema验证通过",
          data: {
            receivedHeaders: headers,
            receivedCookies: cookies,
            timestamp: new Date().toISOString(),
          },
        };
      }
    ),
  },

  /**
   * GET /test/cookies - 测试Cookies Schema验证
   * 验证Cookie格式
   */
  {
    method: "GET",
    path: "/test/cookies",
    handler: createRouteHandler(
      {
        cookies: TestCookiesSchema,
        middleware: [logger],
      },
      ({ req, cookies }) => {
        // 可以解构需要的参数
        return {
          success: true,
          message: "Cookies Schema验证通过",
          data: {
            receivedCookies: cookies,
            timestamp: new Date().toISOString(),
          },
        };
      }
    ),
  },

  /**
   * POST /test/all/:id/:action - 测试所有Schema验证
   * 同时验证body、query、params、headers、cookies
   */
  {
    method: "POST",
    path: "/test/all/:id/:action",
    handler: createRouteHandler(
      {
        body: TestBodySchema,
        query: TestQuerySchema,
        params: TestParamsSchema,
        headers: TestHeadersSchema,
        cookies: TestCookiesSchema,
        middleware: [logger],
      },
      ({ req, body, query, params, headers, cookies }) => {
        // 可以解构所有需要的参数
        return {
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
        };
      }
    ),
  },

  /**
   * GET /test/middleware-order - 测试中间件执行顺序
   * 验证中间件的执行顺序
   */
  {
    method: "GET",
    path: "/test/middleware-order",
    handler: createRouteHandler(
      {
        middleware: [logger],
      },
      ({ req }) => {
        // 不需要任何解析数据时，可以只使用 req
        return {
          success: true,
          message: "中间件执行顺序测试",
          data: {
            timestamp: new Date().toISOString(),
          },
        };
      }
    ),
  },

  /**
   * POST /login - 测试高级返回值格式
   * 展示 { data, status, headers } 的用法
   */
  {
    method: "POST",
    path: "/login",
    handler: createRouteHandler(
      {
        middleware: [logger],
      },
      ({ req }) => {
        // 模拟生成 token
        const token = `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // 设置 cookie
        const headers = new Headers();
        headers.set("Set-Cookie", `auth=${token}; HttpOnly; Path=/; Max-Age=3600`);

        // 使用新的返回值格式：{ data, status, headers }
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
      }
    ),
  },
];

// 创建 tirne 服务器实例
const server = new Server([
  {
    method: "GET",
    path: "/health",
    handler: () => new Response("✅ OK"),
  },
  // 直接使用整合后的路由
  ...schemaTestRoutes,
]);

console.log("🚀 服务器配置完成!");
console.log("📡 使用 tirne 框架");
console.log(`📋 可用路由:`);
console.log(`   GET /health`);
schemaTestRoutes.forEach((route) => {
  console.log(`   ${route.method} ${route.path}`);
});

// 导出 fetch 函数供运行时环境使用
export default {
  fetch: (req: Request) => server.fetch(req),
};
