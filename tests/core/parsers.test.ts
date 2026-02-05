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
  parseFormData,
  parseFile,
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

/**
 * parseFormData 和 parseFile 的 GET/HEAD 防御测试
 * 
 * 背景：这些函数用于文件上传，通常只用于 POST 请求
 * 但为了防御性编程，应该在 GET/HEAD 请求时抛出明确的错误
 */
describe("parseFormData GET/HEAD 请求防御", () => {
  it("GET 请求调用 parseFormData 应抛出错误", async () => {
    const getRequest = new Request("http://localhost:3000/api/upload", {
      method: "GET",
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    await expect(parseFormData(getRequest)).rejects.toThrow(
      "GET/HEAD 请求不能包含表单数据"
    );
  });

  it("HEAD 请求调用 parseFormData 应抛出错误", async () => {
    const headRequest = new Request("http://localhost:3000/api/upload", {
      method: "HEAD",
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    await expect(parseFormData(headRequest)).rejects.toThrow(
      "GET/HEAD 请求不能包含表单数据"
    );
  });

  it("非 multipart/form-data 请求应抛出格式错误", async () => {
    const postRequest = new Request("http://localhost:3000/api/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: "test" }),
    });

    await expect(parseFormData(postRequest)).rejects.toThrow(
      "请求不是 multipart/form-data 格式"
    );
  });
});

describe("parseFile GET/HEAD 请求防御", () => {
  it("GET 请求调用 parseFile 应抛出错误", async () => {
    const getRequest = new Request("http://localhost:3000/api/upload", {
      method: "GET",
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    await expect(parseFile(getRequest)).rejects.toThrow(
      "GET/HEAD 请求不能包含文件"
    );
  });

  it("HEAD 请求调用 parseFile 应抛出错误", async () => {
    const headRequest = new Request("http://localhost:3000/api/upload", {
      method: "HEAD",
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    await expect(parseFile(headRequest)).rejects.toThrow(
      "GET/HEAD 请求不能包含文件"
    );
  });

  it("非 multipart/form-data 请求应抛出格式错误", async () => {
    const postRequest = new Request("http://localhost:3000/api/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: "test" }),
    });

    await expect(parseFile(postRequest)).rejects.toThrow(
      "请求不是 multipart/form-data 格式"
    );
  });
});

/**
 * 文件上传 HTTP 方法支持测试
 * 
 * 业界最佳实践：
 * - POST：上传新文件，服务器决定存储位置（最常用）
 * - PUT：上传到指定位置，或替换已有文件
 * 
 * 参考：AWS S3、阿里云 OSS 等主流云存储都支持 POST 和 PUT
 */
describe("文件上传 HTTP 方法支持", () => {
  // 创建模拟的 multipart/form-data 请求
  function createFormDataRequest(method: string): Request {
    const formData = new FormData();
    formData.append("name", "test");
    
    return new Request("http://localhost:3000/api/upload", {
      method,
      body: formData,
    });
  }

  it("POST 请求应该能正常调用 parseFormData（不抛出方法错误）", async () => {
    const postRequest = createFormDataRequest("POST");
    
    // POST 请求应该能通过方法检查，进入格式解析阶段
    // 这里只验证不会因为 HTTP 方法而抛出错误
    try {
      await parseFormData(postRequest);
    } catch (error) {
      // 如果有错误，不应该是 GET/HEAD 相关的错误
      expect((error as Error).message).not.toContain("GET/HEAD");
    }
  });

  it("PUT 请求应该能正常调用 parseFormData（不抛出方法错误）", async () => {
    const putRequest = createFormDataRequest("PUT");
    
    try {
      await parseFormData(putRequest);
    } catch (error) {
      expect((error as Error).message).not.toContain("GET/HEAD");
    }
  });

  it("PATCH 请求应该能正常调用 parseFormData（不抛出方法错误）", async () => {
    const patchRequest = createFormDataRequest("PATCH");
    
    try {
      await parseFormData(patchRequest);
    } catch (error) {
      expect((error as Error).message).not.toContain("GET/HEAD");
    }
  });

  it("DELETE 请求应该能正常调用 parseFormData（不抛出方法错误）", async () => {
    const deleteRequest = createFormDataRequest("DELETE");
    
    try {
      await parseFormData(deleteRequest);
    } catch (error) {
      expect((error as Error).message).not.toContain("GET/HEAD");
    }
  });
});
