/**
 * 工厂路由测试文件
 * 测试 createRouteHandler 的核心功能
 *
 * 这个文件应该保留，因为它测试了核心的工厂路由功能
 */

import { describe, it, expect } from "vitest";
import { createRouteHandler } from "../../src/utils/route-handler-factory";
import { Type } from "@sinclair/typebox";

// 测试用的简单响应内容
const simpleMessage = "Hello from vafast";

// 创建测试请求
function createTestRequest() {
  return new Request("http://localhost:3000/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "测试用户",
      age: 25,
      email: "test@example.com",
    }),
  });
}

describe("工厂路由功能测试", () => {
  it("应该正确处理无 schema 配置的工厂路由", async () => {
    const factoryHandler = createRouteHandler({}, async ({ body }) => {
      return {
        message: simpleMessage,
        body: body,
        hasBody: body !== undefined,
      };
    });

    const request = createTestRequest();
    const response = await factoryHandler(request);

    // 无 schema 时，应该能正常处理，返回 200
    expect(response.status).toBe(200);
  });

  it("应该正确处理有 body schema 配置的工厂路由", async () => {
    const factoryHandler = createRouteHandler(
      {
        body: Type.Object({
          name: Type.String(),
          age: Type.Number(),
          email: Type.String(),
        }),
      },
      async ({ body }) => {
        return {
          message: simpleMessage,
          body: body,
          hasBody: body !== undefined,
        };
      }
    );

    const request = createTestRequest();
    const response = await factoryHandler(request);

    // 有 schema 时，应该能正确解析 body
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.hasBody).toBe(true);
    expect(data.body).toEqual({
      name: "测试用户",
      age: 25,
      email: "test@example.com",
    });
  });

  it("应该正确处理空请求体", async () => {
    const factoryHandler = createRouteHandler({}, async ({ body }) => {
      return {
        message: simpleMessage,
        body: body,
        hasBody: body !== undefined,
      };
    });

    const emptyRequest = new Request("http://localhost:3000/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "",
    });

    const response = await factoryHandler(emptyRequest);
    // 空请求体时，应该返回 200，但 body 是 undefined
    expect(response.status).toBe(200);
  });

  it("应该支持 query 参数解析", async () => {
    const factoryHandler = createRouteHandler(
      {
        query: Type.Object({
          name: Type.String(),
          age: Type.String(),
        }),
      },
      async ({ query }) => {
        return {
          message: simpleMessage,
          query,
        };
      }
    );

    const request = new Request("http://localhost:3000/?name=张三&age=25");
    const response = await factoryHandler(request);

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.query).toEqual({
      name: "张三",
      age: "25",
    });
  });

  it("应该支持 headers 参数解析", async () => {
    const factoryHandler = createRouteHandler(
      {
        headers: Type.Object({
          "content-type": Type.String(),
          "user-agent": Type.String(),
        }),
      },
      async ({ headers }) => {
        return {
          message: simpleMessage,
          headers,
        };
      }
    );

    const request = new Request("http://localhost:3000/", {
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "VafastTest/1.0",
      },
    });

    const response = await factoryHandler(request);

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.headers["content-type"]).toBe("application/json");
    expect(data.headers["user-agent"]).toBe("VafastTest/1.0");
  });
});
