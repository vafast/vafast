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

/**
 * GET/HEAD 请求 body 解析防御测试
 * 
 * 背景：HTTP 规范中，GET/HEAD 请求通常不带 body
 * 但某些客户端（如 Electron）可能会为 GET 请求添加 Content-Type: application/json header
 * 框架应该优雅地处理这种情况，而不是报错
 * 
 * 参考：Fastify 文档 "for GET and HEAD requests, the payload is never parsed"
 */
describe("GET/HEAD 请求 body 解析防御", () => {
  it("GET 请求调用 parseBody 应返回 null（即使有 Content-Type header）", async () => {
    // 模拟客户端发送带 Content-Type 的 GET 请求
    const getRequest = new Request("http://localhost:3000/api/data", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const body = await parseBody(getRequest);
    expect(body).toBeNull();
  });

  it("HEAD 请求调用 parseBody 应返回 null", async () => {
    const headRequest = new Request("http://localhost:3000/api/data", {
      method: "HEAD",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const body = await parseBody(headRequest);
    expect(body).toBeNull();
  });

  it("POST 请求应正常解析 body", async () => {
    const postRequest = new Request("http://localhost:3000/api/data", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: "hello" }),
    });

    const body = await parseBody(postRequest);
    expect(body).toEqual({ message: "hello" });
  });

  it("PUT 请求应正常解析 body", async () => {
    const putRequest = new Request("http://localhost:3000/api/data", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: 1, name: "test" }),
    });

    const body = await parseBody(putRequest);
    expect(body).toEqual({ id: 1, name: "test" });
  });

  it("PATCH 请求应正常解析 body", async () => {
    const patchRequest = new Request("http://localhost:3000/api/data", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "updated" }),
    });

    const body = await parseBody(patchRequest);
    expect(body).toEqual({ name: "updated" });
  });

  it("DELETE 请求应正常解析 body（如果有的话）", async () => {
    const deleteRequest = new Request("http://localhost:3000/api/data", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason: "不再需要" }),
    });

    const body = await parseBody(deleteRequest);
    expect(body).toEqual({ reason: "不再需要" });
  });
});
