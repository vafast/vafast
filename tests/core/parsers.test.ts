/**
 * 综合解析器测试文件
 * 测试 query params、headers、cookies、body 解析功能
 *
 * 这个文件应该保留，因为它测试了核心功能
 */

import { describe, it, expect } from "vitest";
import {
  parseQuery,
  parseHeaders,
  parseCookies,
  parseBody,
} from "../../src/utils/parsers";

// 创建包含所有数据类型的测试请求
function createCompleteTestRequest() {
  const url = new URL("http://localhost:3000/test");

  // 添加 query parameters
  url.searchParams.set("name", "张三");
  url.searchParams.set("age", "25");
  url.searchParams.set("city", "北京");
  url.searchParams.set("hobbies", "编程,阅读");

  const request = new Request(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer token123",
      "User-Agent": "VafastTest/1.0",
      Accept: "application/json",
      "X-Custom-Header": "CustomValue",
      Cookie: "sessionId=abc123; userId=456; theme=dark; lang=zh-CN",
    },
    body: JSON.stringify({
      user: {
        name: "李四",
        email: "lisi@example.com",
        profile: {
          age: 30,
          city: "上海",
        },
      },
      preferences: ["tech", "music"],
      metadata: {
        timestamp: "2024-01-01T00:00:00Z",
        version: "1.0",
      },
    }),
  });

  return request;
}

describe("解析器功能测试", () => {
  it("应该正确解析 Query Parameters", () => {
    const request = createCompleteTestRequest();
    const queryParams = parseQuery(request);

    expect(queryParams).toEqual({
      name: "张三",
      age: "25",
      city: "北京",
      hobbies: "编程,阅读",
    });
  });

  it("应该正确解析 Headers", () => {
    const request = createCompleteTestRequest();
    const headers = parseHeaders(request);

    expect(headers["content-type"]).toBe("application/json");
    expect(headers["authorization"]).toBe("Bearer token123");
    expect(headers["user-agent"]).toBe("VafastTest/1.0");
    expect(headers["x-custom-header"]).toBe("CustomValue");
  });

  it("应该正确解析 Cookies", () => {
    const request = createCompleteTestRequest();
    const cookies = parseCookies(request);

    expect(cookies).toEqual({
      sessionId: "abc123",
      userId: "456",
      theme: "dark",
      lang: "zh-CN",
    });
  });

  it("应该正确解析 Body", async () => {
    const request = createCompleteTestRequest();
    const body = await parseBody(request);

    expect(body).toEqual({
      user: {
        name: "李四",
        email: "lisi@example.com",
        profile: {
          age: 30,
          city: "上海",
        },
      },
      preferences: ["tech", "music"],
      metadata: {
        timestamp: "2024-01-01T00:00:00Z",
        version: "1.0",
      },
    });
  });

  it("应该处理空请求体", async () => {
    const emptyRequest = new Request("http://localhost:3000/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "",
    });

    const body = await parseBody(emptyRequest);
    expect(body).toBeUndefined();
  });

  it("应该处理空查询参数", () => {
    const emptyQueryRequest = new Request("http://localhost:3000/test");
    const queryParams = parseQuery(emptyQueryRequest);

    expect(queryParams).toEqual({});
  });

  it("应该处理无 Cookie 的请求", () => {
    const noCookieRequest = new Request("http://localhost:3000/test");
    const cookies = parseCookies(noCookieRequest);

    expect(cookies).toEqual({});
  });
});
