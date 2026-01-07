import { describe, it, expect, beforeEach } from "vitest";
import { Server, createRouteRegistry } from "../../src";
import type { Route, NestedRoute } from "../../src";

describe("RouteRegistry 路由注册表", () => {
  describe("基础功能", () => {
    let server: Server;

    beforeEach(() => {
      const routes: Route[] = [
        {
          method: "GET",
          path: "/health",
          handler: () => new Response("ok"),
          name: "健康检查",
          description: "检查服务是否正常运行",
        },
        {
          method: "POST",
          path: "/auth/signIn",
          handler: () => new Response("ok"),
          name: "用户登录",
          description: "用户通过邮箱密码登录",
        },
        {
          method: "POST",
          path: "/auth/signUp",
          handler: () => new Response("ok"),
          name: "用户注册",
        },
        {
          method: "GET",
          path: "/users",
          handler: () => new Response("ok"),
        },
      ];
      server = new Server(routes);
    });

    it("应该能获取所有路由", () => {
      const registry = createRouteRegistry(server.getRoutesWithMeta());
      const routes = registry.getAll();

      expect(routes).toHaveLength(4);
      expect(routes.map((r) => r.fullPath)).toContain("/health");
      expect(routes.map((r) => r.fullPath)).toContain("/auth/signIn");
    });

    it("应该能按 method + path 查询路由", () => {
      const registry = createRouteRegistry(server.getRoutesWithMeta());

      const route = registry.get("POST", "/auth/signIn");
      expect(route).toBeDefined();
      expect(route?.name).toBe("用户登录");
      expect(route?.description).toBe("用户通过邮箱密码登录");

      const notFound = registry.get("DELETE", "/auth/signIn");
      expect(notFound).toBeUndefined();
    });

    it("应该能检查路由是否存在", () => {
      const registry = createRouteRegistry(server.getRoutesWithMeta());

      expect(registry.has("POST", "/auth/signIn")).toBe(true);
      expect(registry.has("DELETE", "/auth/signIn")).toBe(false);
      expect(registry.has("GET", "/notexist")).toBe(false);
    });

    it("应该能获取路由数量", () => {
      const registry = createRouteRegistry(server.getRoutesWithMeta());
      expect(registry.size).toBe(4);
    });
  });

  describe("分类功能", () => {
    let server: Server;

    beforeEach(() => {
      const routes: Route[] = [
        { method: "POST", path: "/auth/signIn", handler: () => new Response("ok") },
        { method: "POST", path: "/auth/signUp", handler: () => new Response("ok") },
        { method: "POST", path: "/auth/signOut", handler: () => new Response("ok") },
        { method: "GET", path: "/users", handler: () => new Response("ok") },
        { method: "PUT", path: "/users/update", handler: () => new Response("ok") },
        { method: "GET", path: "/health", handler: () => new Response("ok") },
      ];
      server = new Server(routes);
    });

    it("应该能获取所有分类", () => {
      const registry = createRouteRegistry(server.getRoutesWithMeta());
      const categories = registry.getCategories();

      expect(categories).toContain("auth");
      expect(categories).toContain("users");
      expect(categories).toContain("health");
      expect(categories).toHaveLength(3);
    });

    it("应该能按分类获取路由", () => {
      const registry = createRouteRegistry(server.getRoutesWithMeta());

      const authRoutes = registry.getByCategory("auth");
      expect(authRoutes).toHaveLength(3);
      expect(authRoutes.map((r) => r.fullPath)).toContain("/auth/signIn");

      const userRoutes = registry.getByCategory("users");
      expect(userRoutes).toHaveLength(2);

      const notExist = registry.getByCategory("notexist");
      expect(notExist).toHaveLength(0);
    });
  });

  describe("扩展字段支持", () => {
    interface WebhookConfig {
      eventKey?: string;
      include?: string[];
      exclude?: string[];
    }

    interface MyRouteMeta extends Record<string, unknown> {
      webhook?: WebhookConfig;
      permission?: string;
    }

    let server: Server;

    beforeEach(() => {
      const routes: (Route & MyRouteMeta)[] = [
        {
          method: "POST",
          path: "/auth/signIn",
          handler: () => new Response("ok"),
          name: "用户登录",
          webhook: { eventKey: "auth.signIn", exclude: ["token"] },
        },
        {
          method: "POST",
          path: "/auth/signUp",
          handler: () => new Response("ok"),
          name: "用户注册",
          webhook: { eventKey: "auth.signUp", include: ["userId", "email"] },
        },
        {
          method: "GET",
          path: "/users",
          handler: () => new Response("ok"),
          permission: "users.read",
        },
        {
          method: "PUT",
          path: "/users/update",
          handler: () => new Response("ok"),
          permission: "users.write",
          webhook: { eventKey: "users.update" },
        },
        {
          method: "GET",
          path: "/health",
          handler: () => new Response("ok"),
        },
      ];
      server = new Server(routes as Route[]);
    });

    it("应该能筛选有特定字段的路由", () => {
      const registry = createRouteRegistry<MyRouteMeta>(server.getRoutesWithMeta());

      // 筛选有 webhook 配置的路由
      const webhookRoutes = registry.filter("webhook");
      expect(webhookRoutes).toHaveLength(3);
      expect(webhookRoutes.map((r) => r.fullPath)).toContain("/auth/signIn");
      expect(webhookRoutes.map((r) => r.fullPath)).toContain("/auth/signUp");
      expect(webhookRoutes.map((r) => r.fullPath)).toContain("/users/update");

      // 筛选有 permission 配置的路由
      const permissionRoutes = registry.filter("permission");
      expect(permissionRoutes).toHaveLength(2);
    });

    it("应该能获取扩展字段的值", () => {
      const registry = createRouteRegistry<MyRouteMeta>(server.getRoutesWithMeta());

      const signInRoute = registry.get("POST", "/auth/signIn");
      expect(signInRoute?.webhook).toBeDefined();
      expect(signInRoute?.webhook?.eventKey).toBe("auth.signIn");
      expect(signInRoute?.webhook?.exclude).toContain("token");
    });

    it("应该能按条件筛选路由", () => {
      const registry = createRouteRegistry<MyRouteMeta>(server.getRoutesWithMeta());

      // 筛选所有 POST 请求
      const postRoutes = registry.filterBy((r) => r.method === "POST");
      expect(postRoutes).toHaveLength(2);

      // 筛选有 webhook 且有 include 配置的路由
      const webhookRoutes = registry.filter("webhook") as Array<{ webhook: WebhookConfig; fullPath: string }>;
      const includeRoutes = webhookRoutes.filter((r) => r.webhook?.include);
      expect(includeRoutes).toHaveLength(1);
      expect(includeRoutes[0].fullPath).toBe("/auth/signUp");
    });
  });

  describe("嵌套路由支持", () => {
    let server: Server;

    beforeEach(() => {
      const routes: (Route | NestedRoute)[] = [
        {
          path: "/api",
          children: [
            {
              path: "/auth",
              children: [
                {
                  method: "POST",
                  path: "/signIn",
                  handler: () => new Response("ok"),
                  name: "用户登录",
                },
                {
                  method: "POST",
                  path: "/signUp",
                  handler: () => new Response("ok"),
                  name: "用户注册",
                },
              ],
            },
            {
              path: "/users",
              children: [
                {
                  method: "GET",
                  path: "",
                  handler: () => new Response("ok"),
                  name: "用户列表",
                },
                {
                  method: "GET",
                  path: "/:id",
                  handler: () => new Response("ok"),
                  name: "用户详情",
                },
              ],
            },
          ],
        },
      ];
      server = new Server(routes);
    });

    it("应该能正确处理嵌套路由的完整路径", () => {
      const registry = createRouteRegistry(server.getRoutesWithMeta());
      const routes = registry.getAll();

      expect(routes).toHaveLength(4);
      expect(routes.map((r) => r.fullPath)).toContain("/api/auth/signIn");
      expect(routes.map((r) => r.fullPath)).toContain("/api/auth/signUp");
      expect(routes.map((r) => r.fullPath)).toContain("/api/users");
      expect(routes.map((r) => r.fullPath)).toContain("/api/users/:id");
    });

    it("嵌套路由的分类应该基于完整路径", () => {
      const registry = createRouteRegistry(server.getRoutesWithMeta());
      const categories = registry.getCategories();

      // 分类是第一段路径
      expect(categories).toContain("api");
      expect(categories).toHaveLength(1);
    });

    it("应该能查询嵌套路由", () => {
      const registry = createRouteRegistry(server.getRoutesWithMeta());

      const route = registry.get("POST", "/api/auth/signIn");
      expect(route).toBeDefined();
      expect(route?.name).toBe("用户登录");
    });
  });

  describe("遍历和映射", () => {
    let server: Server;

    beforeEach(() => {
      const routes: Route[] = [
        { method: "GET", path: "/a", handler: () => new Response("ok"), name: "A" },
        { method: "GET", path: "/b", handler: () => new Response("ok"), name: "B" },
        { method: "GET", path: "/c", handler: () => new Response("ok"), name: "C" },
      ];
      server = new Server(routes);
    });

    it("应该支持 forEach 遍历", () => {
      const registry = createRouteRegistry(server.getRoutesWithMeta());
      const names: string[] = [];

      registry.forEach((route) => {
        if (route.name) names.push(route.name);
      });

      expect(names).toEqual(["A", "B", "C"]);
    });

    it("应该支持 map 映射", () => {
      const registry = createRouteRegistry(server.getRoutesWithMeta());

      const paths = registry.map((route) => route.fullPath);
      expect(paths).toEqual(["/a", "/b", "/c"]);
    });
  });

  describe("getRoutesWithMeta 方法", () => {
    it("应该返回完整的路由元信息", () => {
      const routes: Route[] = [
        {
          method: "POST",
          path: "/test",
          handler: () => new Response("ok"),
          name: "测试路由",
          description: "这是一个测试",
          customField: "customValue",
        } as Route,
      ];
      const server = new Server(routes);

      const routesWithMeta = server.getRoutesWithMeta();

      expect(routesWithMeta).toHaveLength(1);
      expect(routesWithMeta[0].fullPath).toBe("/test");
      expect(routesWithMeta[0].name).toBe("测试路由");
      expect(routesWithMeta[0].description).toBe("这是一个测试");
      expect((routesWithMeta[0] as Record<string, unknown>).customField).toBe("customValue");
    });

    it("handler 和 middleware 应该保留在返回结果中", () => {
      const handler = () => new Response("ok");
      const middleware = [async (req: Request, next: () => Promise<Response>) => next()];

      const routes: Route[] = [
        {
          method: "GET",
          path: "/test",
          handler,
          middleware,
        },
      ];
      const server = new Server(routes);

      const routesWithMeta = server.getRoutesWithMeta();

      expect(routesWithMeta[0].handler).toBe(handler);
      expect(routesWithMeta[0].middlewareChain).toHaveLength(1);
    });
  });
});

