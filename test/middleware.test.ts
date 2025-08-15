import { describe, it, expect, beforeEach } from "bun:test";
import { Server } from "../src";
import type { Route, Middleware } from "../src";
import { VafastError } from "../src/middleware";

describe("中间件示例", () => {
  describe("基础中间件", () => {
    let server: Server;
    let routes: Route[];

    beforeEach(() => {
      // 日志中间件
      const logger: Middleware = async (req, next) => {
        const start = Date.now();
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

        const response = await next();

        const duration = Date.now() - start;
        console.log(
          `[${new Date().toISOString()}] ${req.method} ${req.url} - ${
            response.status
          } (${duration}ms)`
        );

        return response;
      };

      // 请求计时中间件
      const timer: Middleware = async (req, next) => {
        const start = performance.now();
        const response = await next();
        const duration = performance.now() - start;

        response.headers.set("X-Response-Time", `${duration.toFixed(2)}ms`);
        return response;
      };

      // 请求 ID 中间件
      const requestId: Middleware = async (req, next) => {
        const id = crypto.randomUUID();
        req.headers.set("X-Request-ID", id);

        const response = await next();
        response.headers.set("X-Request-ID", id);

        return response;
      };

      routes = [
        {
          method: "GET",
          path: "/",
          handler: () =>
            new Response("Hello with middleware!", {
              headers: { "Content-Type": "text/plain" },
            }),
          middleware: [logger, timer, requestId],
        },
        {
          method: "GET",
          path: "/api/data",
          handler: () =>
            new Response(JSON.stringify({ message: "Protected data" }), {
              headers: { "Content-Type": "application/json" },
            }),
          middleware: [logger, requestId],
        },
      ];
      server = new Server(routes);
    });

    it("应该对根路径应用所有中间件", async () => {
      const request = new Request("http://localhost/", { method: "GET" });
      const response = await server.fetch(request);

      expect(response.status).toBe(200);
      expect(await response.text()).toBe("Hello with middleware!");
      expect(response.headers.get("X-Response-Time")).toBeDefined();
      expect(response.headers.get("X-Request-ID")).toBeDefined();
    });

    it("应该对 API 路径应用部分中间件", async () => {
      const request = new Request("http://localhost/api/data", { method: "GET" });
      const response = await server.fetch(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe("Protected data");
      expect(response.headers.get("X-Request-ID")).toBeDefined();
      // 这个路径没有 timer 中间件
      expect(response.headers.get("X-Response-Time")).toBeNull();
    });
  });

  describe("CORS 中间件", () => {
    let server: Server;
    let routes: Route[];

    beforeEach(() => {
      // CORS 中间件
      const createCORS = (
        options: {
          origin?: string[] | "*";
          methods?: string[];
          headers?: string[];
          credentials?: boolean;
          maxAge?: number;
        } = {}
      ): Middleware => {
        const {
          origin = "*",
          methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
          headers = ["Content-Type", "Authorization"],
          credentials = false,
          maxAge,
        } = options;

        return async (req, next) => {
          const reqOrigin = req.headers.get("Origin") || "";
          const isAllowedOrigin = origin === "*" || origin.includes(reqOrigin);

          if (req.method === "OPTIONS") {
            const resHeaders = new Headers();
            if (isAllowedOrigin) {
              resHeaders.set("Access-Control-Allow-Origin", origin === "*" ? "*" : reqOrigin);
              resHeaders.set("Access-Control-Allow-Methods", methods.join(","));
              resHeaders.set("Access-Control-Allow-Headers", headers.join(","));
              if (credentials) resHeaders.set("Access-Control-Allow-Credentials", "true");
              if (maxAge) resHeaders.set("Access-Control-Max-Age", maxAge.toString());
            }
            return new Response(null, { status: 204, headers: resHeaders });
          }

          const res = await next();
          if (isAllowedOrigin) {
            res.headers.set("Access-Control-Allow-Origin", origin === "*" ? "*" : reqOrigin);
            if (credentials) res.headers.set("Access-Control-Allow-Credentials", "true");
          }
          return res;
        };
      };

      const cors = createCORS({
        origin: ["https://example.com", "https://admin.example.com"],
        credentials: true,
        headers: ["Content-Type", "Authorization"],
        methods: ["GET", "POST"],
        maxAge: 86400,
      });

      routes = [
        {
          method: "GET",
          path: "/data",
          handler: () =>
            new Response(
              JSON.stringify({
                message: "Hello with CORS",
              }),
              {
                headers: { "Content-Type": "application/json" },
              }
            ),
        },
        {
          method: "POST",
          path: "/data",
          handler: async (req) => {
            const body = await req.json();
            return new Response(
              JSON.stringify({
                message: "Data received with CORS",
                data: body,
              }),
              {
                headers: { "Content-Type": "application/json" },
              }
            );
          },
        },
      ];

      server = new Server(routes);
      server.use(cors);
    });

    it("应该处理预检请求", async () => {
      const request = new Request("http://localhost/data", {
        method: "OPTIONS",
        headers: {
          Origin: "https://example.com",
          "Access-Control-Request-Method": "POST",
        },
      });

      const response = await server.fetch(request);

      expect(response.status).toBe(204);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("https://example.com");
      expect(response.headers.get("Access-Control-Allow-Methods")).toBe("GET,POST");
      expect(response.headers.get("Access-Control-Allow-Credentials")).toBe("true");
    });

    it("应该向响应添加 CORS 头", async () => {
      const request = new Request("http://localhost/data", {
        method: "GET",
        headers: { Origin: "https://example.com" },
      });

      const response = await server.fetch(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("https://example.com");
      expect(response.headers.get("Access-Control-Allow-Credentials")).toBe("true");
    });
  });

  describe("Rate Limit Middleware", () => {
    let server: Server;
    let routes: Route[];

    beforeEach(() => {
      // 速率限制中间件
      const rateLimit = (options: { windowMs: number; max: number }): Middleware => {
        const { windowMs, max } = options;
        const requestCounts = new Map<string, { count: number; resetTime: number }>();

        return async (req, next) => {
          const clientId = req.headers.get("X-Forwarded-For") || "unknown";
          const now = Date.now();
          const clientData = requestCounts.get(clientId);

          if (!clientData || now > clientData.resetTime) {
            requestCounts.set(clientId, { count: 1, resetTime: now + windowMs });
          } else if (clientData.count >= max) {
            return new Response(
              JSON.stringify({
                error: "rate_limit",
                message: "请求过于频繁",
              }),
              {
                status: 429,
                headers: { "Content-Type": "application/json" },
              }
            );
          } else {
            clientData.count++;
          }

          const response = await next();
          const remaining = Math.max(0, max - (clientData?.count || 0));
          response.headers.set("X-RateLimit-Limit", max.toString());
          response.headers.set("X-RateLimit-Remaining", remaining.toString());

          return response;
        };
      };

      const limiter = rateLimit({
        windowMs: 60_000,
        max: 3,
      });

      routes = [
        {
          method: "GET",
          path: "/limited",
          handler: () =>
            new Response(
              JSON.stringify({
                message: "您在速率限制范围内！",
              }),
              {
                headers: { "Content-Type": "application/json" },
              }
            ),
          middleware: [limiter],
        },
      ];
      server = new Server(routes);
    });

    it("应该在限制范围内允许请求", async () => {
      for (let i = 0; i < 3; i++) {
        const request = new Request("http://localhost/limited", {
          method: "GET",
          headers: { "X-Forwarded-For": "192.168.1.1" },
        });
        const response = await server.fetch(request);

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.message).toBe("您在速率限制范围内！");
      }
    });

    it("应该阻止超过限制的请求", async () => {
      // 先发送3个请求
      for (let i = 0; i < 3; i++) {
        await server.fetch(
          new Request("http://localhost/limited", {
            method: "GET",
            headers: { "X-Forwarded-For": "192.168.1.2" },
          })
        );
      }

      // 第4个请求应该被阻止
      const request = new Request("http://localhost/limited", {
        method: "GET",
        headers: { "X-Forwarded-For": "192.168.1.2" },
      });
      const response = await server.fetch(request);

      expect(response.status).toBe(429);
      const data = await response.json();
      expect(data.error).toBe("rate_limit");
      expect(data.message).toBe("请求过于频繁");
    });
  });

  describe("Error Handling Middleware", () => {
    let server: Server;
    let routes: Route[];

    beforeEach(() => {
      routes = [
        {
          method: "GET",
          path: "/",
          handler: (req) => {
            const name = new URL(req.url).searchParams.get("name");
            if (!name) {
              throw new VafastError("缺少名称参数", {
                status: 400,
                type: "bad_request",
                expose: true,
              });
            }
            return new Response(`你好，${name}！`, {
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            });
          },
        },
        {
          method: "POST",
          path: "/users",
          handler: async (req) => {
            const body = await req.json();
            const { name, email } = body;

            if (!name || !email) {
              throw new VafastError("缺少必填字段", {
                status: 400,
                type: "validation_error",
                expose: true,
              });
            }

            return new Response(
              JSON.stringify({
                message: "用户创建成功",
                user: { id: 1, name, email },
              }),
              {
                status: 201,
                headers: { "Content-Type": "application/json" },
              }
            );
          },
        },
      ];
      server = new Server(routes);
    });

    it("应该为缺少名称参数抛出错误", async () => {
      const request = new Request("http://localhost/", { method: "GET" });
      const response = await server.fetch(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("bad_request");
      expect(data.message).toBe("缺少名称参数");
    });

    it("应该为有效名称参数返回成功", async () => {
      const request = new Request("http://localhost/?name=张三", { method: "GET" });
      const response = await server.fetch(request);

      expect(response.status).toBe(200);
      expect(await response.text()).toBe("你好，张三！");
    });

    it("应该为缺少字段抛出验证错误", async () => {
      const request = new Request("http://localhost/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "张三" }), // 缺少 email
      });

      const response = await server.fetch(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("validation_error");
      expect(data.message).toBe("缺少必填字段");
    });

    it("应该成功创建用户", async () => {
      const request = new Request("http://localhost/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "张三", email: "zhangsan@example.com" }),
      });

      const response = await server.fetch(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.message).toBe("用户创建成功");
      expect(data.user.name).toBe("张三");
      expect(data.user.email).toBe("zhangsan@example.com");
    });
  });
});
