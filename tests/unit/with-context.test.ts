import { describe, it, expect } from "vitest";
import { Server } from "../../src/server";
import { defineRoutes, defineRoute, defineMiddleware, withContext } from "../../src/defineRoute";
import { Type } from "@sinclair/typebox";

// 定义 UserInfo 类型
interface UserInfo {
  id: string;
  email: string;
  role: string;
}

// 模拟认证中间件
const authMiddleware = defineMiddleware<{ userInfo: UserInfo }>(async (req, next) => {
  // 模拟从 JWT 解析出 userInfo
  const userInfo: UserInfo = {
    id: "user-123",
    email: "test@example.com",
    role: "admin",
  };
  return next({ userInfo });
});

describe("withContext 工厂函数", () => {
  describe("类型推断", () => {
    it("应该通过类型检查 - withContext 创建的路由定义器", () => {
      // 创建带 UserInfo 上下文的路由定义器
      const defineAuthRoute = withContext<{ userInfo: UserInfo }>();

      // 使用 defineAuthRoute，handler 中应该能解构 userInfo
      const routes = defineRoutes([
        defineRoute({
          path: "/api",
          middleware: [authMiddleware],
          children: [
            defineAuthRoute({
              method: "GET",
              path: "/profile",
              handler: ({ userInfo }) => {
                // userInfo 应该有类型
                return {
                  id: userInfo.id,
                  email: userInfo.email,
                  role: userInfo.role,
                };
              },
            }),
          ],
        }),
      ]);

      expect(routes).toHaveLength(1);
      expect(routes[0].path).toBe("/api/profile");
      expect(routes[0].method).toBe("GET");
    });

    it("应该支持 schema 和 context 同时使用", () => {
      const defineAuthRoute = withContext<{ userInfo: UserInfo }>();

      const routes = defineRoutes([
        defineRoute({
          path: "/users",
          middleware: [authMiddleware],
          children: [
            defineAuthRoute({
              method: "POST",
              path: "/update",
              schema: {
                body: Type.Object({
                  name: Type.String(),
                  age: Type.Number(),
                }),
              },
              handler: ({ body, userInfo }) => {
                // body 和 userInfo 都应该有类型
                return {
                  updatedBy: userInfo.id,
                  newName: body.name,
                  newAge: body.age,
                };
              },
            }),
          ],
        }),
      ]);

      expect(routes).toHaveLength(1);
      expect(routes[0].schema).toBeDefined();
    });
  });

  describe("服务器集成", () => {
    it("应该正确执行 handler 并获取中间件注入的上下文", async () => {
      const defineAuthRoute = withContext<{ userInfo: UserInfo }>();

      const routes = defineRoutes([
        defineRoute({
          path: "/api",
          middleware: [authMiddleware],
          children: [
            defineAuthRoute({
              method: "GET",
              path: "/me",
              handler: ({ userInfo }) => {
                return {
                  success: true,
                  data: {
                    id: userInfo.id,
                    email: userInfo.email,
                  },
                };
              },
            }),
          ],
        }),
      ]);

      const server = new Server(routes);

      const req = new Request("http://localhost:3000/api/me", {
        method: "GET",
      });

      const response = await server.fetch(req);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.id).toBe("user-123");
      expect(body.data.email).toBe("test@example.com");
    });

    it("应该支持可选上下文", async () => {
      const defineOptionalAuthRoute = withContext<{ userInfo?: UserInfo }>();

      // 不需要认证的路由
      const routes = defineRoutes([
        defineOptionalAuthRoute({
          method: "GET",
          path: "/public",
          handler: ({ userInfo }) => {
            // userInfo 可能为 undefined
            return {
              isLoggedIn: !!userInfo,
              userId: userInfo?.id || "anonymous",
            };
          },
        }),
      ]);

      const server = new Server(routes);

      const req = new Request("http://localhost:3000/public", {
        method: "GET",
      });

      const response = await server.fetch(req);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.isLoggedIn).toBe(false);
      expect(body.userId).toBe("anonymous");
    });
  });

  describe("与 context 属性对比", () => {
    it("context 属性方式也应该工作", () => {
      // 使用 context 属性声明上下文类型
      const routes = defineRoutes([
        defineRoute({
          path: "/api",
          middleware: [authMiddleware],
          children: [
            defineRoute({
              method: "GET",
              path: "/profile",
              context: {} as { userInfo: UserInfo },
              handler: ({ userInfo }) => {
                return { id: userInfo.id };
              },
            }),
          ],
        }),
      ]);

      expect(routes).toHaveLength(1);
    });
  });

  describe("类型推断限制说明", () => {
    it("父级中间件的类型无法自动推导到子路由", () => {
      /**
       * 这是 TypeScript 的限制，不是 vafast 的问题
       *
       * 原因：TypeScript 只能在同一个函数调用中推断类型
       * children 中的 defineRoute 是独立的函数调用，无法感知父级的 middleware 类型
       */

      const routes = defineRoutes([
        defineRoute({
          path: "/api",
          middleware: [authMiddleware],  // ← 中间件在父级定义
          children: [
            // ❌ 这里的 handler 无法自动获得 userInfo 类型
            // 因为这是独立的 defineRoute 调用
            defineRoute({
              method: "GET",
              path: "/profile",
              // handler: ({ userInfo }) => { ... }  // TS Error: userInfo 不存在
              handler: () => ({ message: "需要手动声明类型" }),
            }),
          ],
        }),
      ]);

      expect(routes).toHaveLength(1);
    });

    it("解决方案1：使用 withContext 工厂函数", () => {
      const defineAuthRoute = withContext<{ userInfo: UserInfo }>();

      const routes = defineRoutes([
        defineRoute({
          path: "/api",
          middleware: [authMiddleware],
          children: [
            // ✅ defineAuthRoute 预设了上下文类型
            defineAuthRoute({
              method: "GET",
              path: "/profile",
              handler: ({ userInfo }) => {
                return { id: userInfo.id };  // userInfo 有类型！
              },
            }),
          ],
        }),
      ]);

      expect(routes).toHaveLength(1);
    });

    it("解决方案2：使用 context 属性", () => {
      const routes = defineRoutes([
        defineRoute({
          path: "/api",
          middleware: [authMiddleware],
          children: [
            // ✅ 使用 context 属性声明类型
            defineRoute({
              method: "GET",
              path: "/profile",
              context: {} as { userInfo: UserInfo },
              handler: ({ userInfo }) => {
                return { id: userInfo.id };  // userInfo 有类型！
              },
            }),
          ],
        }),
      ]);

      expect(routes).toHaveLength(1);
    });

    it("解决方案3：中间件在同一个 defineRoute 中声明（自动推导）", () => {
      const routes = defineRoutes([
        defineRoute({
          path: "/api",
          children: [
            // ✅ 中间件在同一个 defineRoute 中，类型自动推导
            defineRoute({
              method: "GET",
              path: "/profile",
              middleware: [authMiddleware],  // ← 中间件在这里
              handler: ({ userInfo }) => {
                return { id: userInfo.id };  // userInfo 自动有类型！
              },
            }),
          ],
        }),
      ]);

      expect(routes).toHaveLength(1);
    });
  });
});
