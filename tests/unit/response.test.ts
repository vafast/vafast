import { describe, it, expect } from "vitest";
import {
  json,
  text,
  html,
  redirect,
  empty,
  stream,
  err,
} from "../../src/utils/response";
import { VafastError } from "../../src/middleware";

describe("Response 工具函数", () => {
  describe("json()", () => {
    it("应该返回 200 JSON 响应", async () => {
      const response = json({ name: "test" });
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("application/json");
      expect(await response.json()).toEqual({ name: "test" });
    });

    it("应该支持自定义状态码", async () => {
      const response = json({ id: 1 }, 201);
      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({ id: 1 });
    });

    it("应该支持自定义头部", async () => {
      const response = json({ ok: true }, 200, { "X-Custom": "value" });
      expect(response.headers.get("X-Custom")).toBe("value");
      expect(response.headers.get("content-type")).toBe("application/json");
    });
  });

  describe("text()", () => {
    it("应该返回纯文本响应", async () => {
      const response = text("Hello World");
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/plain");
      expect(await response.text()).toBe("Hello World");
    });

    it("应该支持自定义状态码", async () => {
      const response = text("Created", 201);
      expect(response.status).toBe(201);
    });
  });

  describe("html()", () => {
    it("应该返回 HTML 响应", async () => {
      const response = html("<h1>Hello</h1>");
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/html");
      expect(await response.text()).toBe("<h1>Hello</h1>");
    });
  });

  describe("redirect()", () => {
    it("应该返回 302 重定向", () => {
      const response = redirect("/new-url");
      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toBe("/new-url");
    });

    it("应该支持 301 永久重定向", () => {
      const response = redirect("/permanent", 301);
      expect(response.status).toBe(301);
      expect(response.headers.get("location")).toBe("/permanent");
    });
  });

  describe("empty()", () => {
    it("应该返回 204 空响应", async () => {
      const response = empty();
      expect(response.status).toBe(204);
      expect(await response.text()).toBe("");
    });

    it("应该支持自定义状态码", () => {
      const response = empty(201);
      expect(response.status).toBe(201);
    });
  });

  describe("stream()", () => {
    it("应该返回流式响应", () => {
      const readable = new ReadableStream();
      const response = stream(readable);
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe(
        "application/octet-stream"
      );
    });
  });
});

describe("err() 错误工具函数", () => {
  describe("err()", () => {
    it("应该创建 VafastError 实例", () => {
      const error = err("Test error", 400, "TEST_ERROR");
      expect(error).toBeInstanceOf(VafastError);
      expect(error.message).toBe("Test error");
      expect(error.status).toBe(400);
      expect(error.type).toBe("TEST_ERROR");
      expect(error.expose).toBe(true);
    });

    it("应该使用默认值", () => {
      const error = err("Default error");
      expect(error.status).toBe(500);
      expect(error.type).toBe("ERROR");
    });
  });

  describe("err.badRequest()", () => {
    it("应该创建 400 错误", () => {
      const error = err.badRequest("参数错误");
      expect(error.status).toBe(400);
      expect(error.type).toBe("BAD_REQUEST");
      expect(error.message).toBe("参数错误");
    });

    it("应该使用默认消息", () => {
      const error = err.badRequest();
      expect(error.message).toBe("请求参数错误");
    });
  });

  describe("err.unauthorized()", () => {
    it("应该创建 401 错误", () => {
      const error = err.unauthorized("请先登录");
      expect(error.status).toBe(401);
      expect(error.type).toBe("UNAUTHORIZED");
      expect(error.message).toBe("请先登录");
    });
  });

  describe("err.forbidden()", () => {
    it("应该创建 403 错误", () => {
      const error = err.forbidden("无权限");
      expect(error.status).toBe(403);
      expect(error.type).toBe("FORBIDDEN");
      expect(error.message).toBe("无权限");
    });
  });

  describe("err.notFound()", () => {
    it("应该创建 404 错误", () => {
      const error = err.notFound("用户不存在");
      expect(error.status).toBe(404);
      expect(error.type).toBe("NOT_FOUND");
      expect(error.message).toBe("用户不存在");
    });
  });

  describe("err.conflict()", () => {
    it("应该创建 409 错误", () => {
      const error = err.conflict("用户名已存在");
      expect(error.status).toBe(409);
      expect(error.type).toBe("CONFLICT");
      expect(error.message).toBe("用户名已存在");
    });
  });

  describe("err.unprocessable()", () => {
    it("应该创建 422 错误", () => {
      const error = err.unprocessable("无法处理");
      expect(error.status).toBe(422);
      expect(error.type).toBe("UNPROCESSABLE_ENTITY");
      expect(error.message).toBe("无法处理");
    });
  });

  describe("err.tooMany()", () => {
    it("应该创建 429 错误", () => {
      const error = err.tooMany("请求过于频繁");
      expect(error.status).toBe(429);
      expect(error.type).toBe("TOO_MANY_REQUESTS");
      expect(error.message).toBe("请求过于频繁");
    });
  });

  describe("err.internal()", () => {
    it("应该创建 500 错误", () => {
      const error = err.internal("服务器错误");
      expect(error.status).toBe(500);
      expect(error.type).toBe("INTERNAL_ERROR");
      expect(error.message).toBe("服务器错误");
    });
  });
});

describe("错误集成测试", () => {
  it("err() 抛出的错误应该能被正确捕获", () => {
    try {
      throw err.notFound("资源不存在");
    } catch (e) {
      expect(e).toBeInstanceOf(VafastError);
      if (e instanceof VafastError) {
        expect(e.status).toBe(404);
        expect(e.type).toBe("NOT_FOUND");
        expect(e.expose).toBe(true);
      }
    }
  });

  it("所有预定义错误方法都应该返回 VafastError", () => {
    const errors = [
      err.badRequest(),
      err.unauthorized(),
      err.forbidden(),
      err.notFound(),
      err.conflict(),
      err.unprocessable(),
      err.tooMany(),
      err.internal(),
    ];

    errors.forEach((error) => {
      expect(error).toBeInstanceOf(VafastError);
      expect(error.expose).toBe(true);
    });
  });
});
