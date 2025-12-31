/**
 * createHandler 类型推导测试
 */

import { describe, it, expect, beforeEach } from "vitest";
import { Type } from "@sinclair/typebox";
import {
  createHandler,
  createHandlerWithExtra,
  simpleHandler,
} from "../../../src/utils/create-handler";

describe("createHandler", () => {
  describe("基本功能", () => {
    it("应该正确处理无 schema 的 handler", async () => {
      const handler = createHandler({})(({ req }) => {
        return { message: "Hello World" };
      });

      const req = new Request("http://localhost/test");
      const res = await handler(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.message).toBe("Hello World");
    });

    it("应该正确处理 body schema", async () => {
      const handler = createHandler({
        body: Type.Object({
          name: Type.String(),
          age: Type.Number(),
        }),
      })(({ body }) => {
        // 类型测试：body 应该有 name 和 age 属性
        return { received: body.name, age: body.age };
      });

      const req = new Request("http://localhost/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Alice", age: 25 }),
      });

      const res = await handler(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.received).toBe("Alice");
      expect(data.age).toBe(25);
    });

    it("应该正确处理 query schema", async () => {
      const handler = createHandler({
        query: Type.Object({
          page: Type.Optional(Type.String()),
          limit: Type.Optional(Type.String()),
        }),
      })(({ query }) => {
        return { page: query.page, limit: query.limit };
      });

      const req = new Request("http://localhost/test?page=1&limit=10");
      const res = await handler(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.page).toBe("1");
      expect(data.limit).toBe("10");
    });

    it("应该正确处理 params schema", async () => {
      const handler = createHandler({
        params: Type.Object({
          id: Type.String(),
        }),
      })(({ params }) => {
        return { userId: params.id };
      });

      const req = new Request("http://localhost/users/123");
      // 模拟路由器注入的 params
      (req as unknown as Record<string, unknown>).params = { id: "123" };

      const res = await handler(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.userId).toBe("123");
    });

    it("应该正确处理多个 schema", async () => {
      const handler = createHandler({
        body: Type.Object({
          action: Type.String(),
        }),
        query: Type.Object({
          verbose: Type.Optional(Type.String()),
        }),
        params: Type.Object({
          id: Type.String(),
        }),
      })(({ body, query, params }) => {
        return {
          action: body.action,
          verbose: query.verbose,
          id: params.id,
        };
      });

      const req = new Request("http://localhost/items/456?verbose=true", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update" }),
      });
      (req as unknown as Record<string, unknown>).params = { id: "456" };

      const res = await handler(req);
      const data = await res.json();

      expect(data.action).toBe("update");
      expect(data.verbose).toBe("true");
      expect(data.id).toBe("456");
    });
  });

  describe("验证功能", () => {
    it("body 验证失败应该返回 400", async () => {
      const handler = createHandler({
        body: Type.Object({
          name: Type.String(),
          age: Type.Number(),
        }),
      })(({ body }) => {
        return { success: true };
      });

      const req = new Request("http://localhost/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Alice", age: "not-a-number" }),
      });

      const res = await handler(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Validation Error");
    });
  });

  describe("响应类型转换", () => {
    it("应该自动转换对象为 JSON", async () => {
      const handler = createHandler({})(({ req }) => {
        return { foo: "bar" };
      });

      const req = new Request("http://localhost/test");
      const res = await handler(req);

      expect(res.headers.get("Content-Type")).toBe("application/json");
    });

    it("应该自动转换字符串为 text/plain", async () => {
      const handler = createHandler({})(({ req }) => {
        return "Hello World";
      });

      const req = new Request("http://localhost/test");
      const res = await handler(req);

      expect(res.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
      expect(await res.text()).toBe("Hello World");
    });

    it("应该保持 Response 对象不变", async () => {
      const handler = createHandler({})(({ req }) => {
        return new Response("Custom Response", { status: 201 });
      });

      const req = new Request("http://localhost/test");
      const res = await handler(req);

      expect(res.status).toBe(201);
      expect(await res.text()).toBe("Custom Response");
    });

    it("应该处理 null/undefined 为 204", async () => {
      const handler = createHandler({})(({ req }) => {
        return null;
      });

      const req = new Request("http://localhost/test");
      const res = await handler(req);

      expect(res.status).toBe(204);
    });

    it("应该处理 { data, status, headers } 格式", async () => {
      const handler = createHandler({})(({ req }) => {
        return {
          data: { success: true },
          status: 201,
          headers: { "X-Custom": "value" },
        };
      });

      const req = new Request("http://localhost/test");
      const res = await handler(req);

      expect(res.status).toBe(201);
      expect(res.headers.get("X-Custom")).toBe("value");
    });
  });
});

describe("createHandlerWithExtra", () => {
  it("应该支持中间件注入的额外类型", async () => {
    type AuthContext = {
      user: { id: string; role: string };
    };

    const handler = createHandlerWithExtra<AuthContext>()({
      body: Type.Object({
        action: Type.String(),
      }),
    })(({ body, user }) => {
      // 类型测试：user 应该有 id 和 role 属性
      return { action: body.action, userId: user.id, role: user.role };
    });

    const req = new Request("http://localhost/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "test" }),
    });

    // 模拟中间件注入
    (req as unknown as Record<string, unknown>).__locals = {
      user: { id: "user-123", role: "admin" },
    };

    const res = await handler(req);
    const data = await res.json();

    expect(data.action).toBe("test");
    expect(data.userId).toBe("user-123");
    expect(data.role).toBe("admin");
  });
});

describe("simpleHandler", () => {
  it("应该处理简单的无 schema handler", async () => {
    const handler = simpleHandler(({ req }) => {
      return { url: req.url };
    });

    const req = new Request("http://localhost/test");
    const res = await handler(req);
    const data = await res.json();

    expect(data.url).toBe("http://localhost/test");
  });
});
