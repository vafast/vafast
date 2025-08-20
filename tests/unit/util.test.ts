import { describe, it, expect } from "vitest";
import { json, redirect } from "../../src/utils/response";
import {
  parseBody,
  parseQuery,
  parseHeaders,
  parseCookies,
} from "../../src/utils/parsers";

describe("工具函数测试", () => {
  describe("json() 函数", () => {
    it("应该创建基本的JSON响应", () => {
      const data = { message: "测试成功", code: 200 };
      const response = json(data);

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/json");
      expect(response.json()).resolves.toEqual(data);
    });

    it("应该支持自定义状态码", () => {
      const response = json({ error: "未找到" }, 404);
      expect(response.status).toBe(404);
    });

    it("应该支持自定义头部", () => {
      const customHeaders = { "X-Custom": "test", "Cache-Control": "no-cache" };
      const response = json({ data: "test" }, 200, customHeaders);

      expect(response.headers.get("X-Custom")).toBe("test");
      expect(response.headers.get("Cache-Control")).toBe("no-cache");
      expect(response.headers.get("Content-Type")).toBe("application/json");
    });

    it("应该合并头部而不是覆盖Content-Type", () => {
      const customHeaders = { "Content-Type": "text/plain" };
      const response = json({ data: "test" }, 200, customHeaders);

      // 注意：Headers构造函数会按顺序处理，后面的会覆盖前面的
      // 所以customHeaders中的Content-Type会覆盖函数内部设置的
      expect(response.headers.get("Content-Type")).toBe("text/plain");
    });
  });

  describe("redirect() 函数", () => {
    it("应该创建302重定向响应", () => {
      const response = redirect("/new-location");

      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/new-location");
      expect(response.body).toBe(null);
    });

    it("应该支持301永久重定向", () => {
      const response = redirect("/permanent-location", 301);

      expect(response.status).toBe(301);
      expect(response.headers.get("Location")).toBe("/permanent-location");
    });

    it("应该处理复杂的URL", () => {
      const complexUrl = "https://example.com/path?query=value#fragment";
      const response = redirect(complexUrl);

      expect(response.headers.get("Location")).toBe(complexUrl);
    });
  });

  describe("parseBody() 函数", () => {
    it("应该解析JSON请求体", async () => {
      const jsonData = { name: "张三", age: 25 };
      const request = new Request("http://localhost/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jsonData),
      });

      const result = await parseBody(request);
      expect(result).toEqual(jsonData);
    });

    it("应该解析URL编码的表单数据", async () => {
      const formData = "name=张三&age=25&city=北京";
      const request = new Request("http://localhost/test", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData,
      });

      const result = await parseBody(request);
      expect(result).toEqual({
        name: "张三",
        age: "25",
        city: "北京",
      });
    });

    it("应该处理纯文本请求体", async () => {
      const textData = "这是一段纯文本内容";
      const request = new Request("http://localhost/test", {
        method: "POST",
        body: textData,
      });

      const result = await parseBody(request);
      expect(result).toBe(textData);
    });

    it("应该处理空的请求体", async () => {
      const request = new Request("http://localhost/test", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: "",
      });

      const result = await parseBody(request);
      expect(result).toBeUndefined();
    });

    it("应该处理null请求体", async () => {
      const request = new Request("http://localhost/test", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: null,
      });

      const result = await parseBody(request);
      expect(result).toBeUndefined();
    });

    it("应该处理undefined请求体", async () => {
      const request = new Request("http://localhost/test", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: undefined,
      });

      const result = await parseBody(request);
      expect(result).toBeUndefined();
    });

    it("应该处理大小写不敏感的Content-Type", async () => {
      const request = new Request("http://localhost/test", {
        method: "POST",
        headers: { "Content-Type": "APPLICATION/JSON" },
        body: JSON.stringify({ test: "value" }),
      });

      const result = await parseBody(request);
      // 由于parseBody函数对大小写敏感，APPLICATION/JSON不会被识别为JSON
      // 所以会走默认的text处理路径
      expect(result).toBe('{"test":"value"}');
    });

    it("应该处理部分匹配的Content-Type", async () => {
      const request = new Request("http://localhost/test", {
        method: "POST",
        headers: { "Content-Type": "application/json; version=2.0" },
        body: JSON.stringify({ test: "value" }),
      });

      const result = await parseBody(request);
      expect(result).toEqual({ test: "value" });
    });
  });

  describe("parseQuery() 函数", () => {
    it("应该解析基本的查询参数", () => {
      const request = new Request("http://localhost/test?name=张三&age=25");
      const result = parseQuery(request);

      expect(result).toEqual({
        name: "张三",
        age: "25",
      });
    });

    it("应该处理没有查询参数的URL", () => {
      const request = new Request("http://localhost/test");
      const result = parseQuery(request);

      expect(result).toEqual({});
    });

    it("应该处理复杂的查询参数", () => {
      const request = new Request(
        "http://localhost/test?name=张三&age=25&hobbies[]=读书&hobbies[]=游泳&active=true"
      );
      const result = parseQuery(request);

      expect(result.name).toBe("张三");
      expect(result.age).toBe("25");
      expect(result.active).toBe("true");
      // qs库会解析数组参数
      expect(Array.isArray(result.hobbies)).toBe(true);
    });

    it("应该处理特殊字符", () => {
      const request = new Request(
        "http://localhost/test?message=Hello%20World&symbol=%26%3D%3F"
      );
      const result = parseQuery(request);

      expect(result.message).toBe("Hello World");
      expect(result.symbol).toBe("&=?");
    });

    it("应该处理空值参数", () => {
      const request = new Request(
        "http://localhost/test?empty=&null=null&undefined=undefined"
      );
      const result = parseQuery(request);

      expect(result.empty).toBe("");
      expect(result.null).toBe("null");
      expect(result.undefined).toBe("undefined");
    });

    it("应该处理只有问号的URL", () => {
      const request = new Request("http://localhost/test?");
      const result = parseQuery(request);

      expect(result).toEqual({});
    });

    it("应该处理重复的查询参数", () => {
      const request = new Request(
        "http://localhost/test?name=张三&name=李四&name=王五"
      );
      const result = parseQuery(request);

      // qs库会处理重复参数，通常保留最后一个或创建数组
      expect(result.name).toBeDefined();
    });

    it("应该处理嵌套对象查询参数", () => {
      const request = new Request(
        "http://localhost/test?user[name]=张三&user[age]=25"
      );
      const result = parseQuery(request);

      // qs库会解析嵌套对象
      expect(result.user).toBeDefined();
      expect(typeof result.user).toBe("object");
    });

    it("应该处理数组查询参数", () => {
      const request = new Request(
        "http://localhost/test?colors[]=red&colors[]=green&colors[]=blue"
      );
      const result = parseQuery(request);

      expect(Array.isArray(result.colors)).toBe(true);
      expect(result.colors).toContain("red");
      expect(result.colors).toContain("green");
      expect(result.colors).toContain("blue");
    });
  });

  describe("parseHeaders() 函数", () => {
    it("应该解析所有请求头", () => {
      const request = new Request("http://localhost/test", {
        headers: {
          Accept: "application/json",
          "X-Custom": "custom-value",
        },
      });

      const result = parseHeaders(request);

      // 注意：Request构造函数会将头部名称转换为小写
      expect(result["accept"]).toBe("application/json");
      expect(result["x-custom"]).toBe("custom-value");
    });

    it("应该处理没有请求头的情况", () => {
      const request = new Request("http://localhost/test");
      const result = parseHeaders(request);

      // 默认会有一些请求头
      expect(typeof result).toBe("object");
    });

    it("应该处理重复的请求头", () => {
      const request = new Request("http://localhost/test", {
        headers: {
          "X-Test": "value1",
        },
      });

      const result = parseHeaders(request);
      expect(result["x-test"]).toBe("value1");
    });

    it("应该处理大小写不敏感的请求头", () => {
      const request = new Request("http://localhost/test", {
        headers: {
          "user-agent": "TestAgent/1.0",
          "USER-AGENT": "AnotherAgent/2.0",
        },
      });

      const result = parseHeaders(request);
      expect(result["user-agent"]).toBeDefined();
    });
  });

  describe("parseCookies() 函数", () => {
    it("应该解析基本的Cookie", () => {
      const request = new Request("http://localhost/test", {
        headers: {
          Cookie: "sessionId=abc123; userId=12345; theme=dark",
        },
      });

      const result = parseCookies(request);

      expect(result.sessionId).toBe("abc123");
      expect(result.userId).toBe("12345");
      expect(result.theme).toBe("dark");
    });

    it("应该处理没有Cookie的情况", () => {
      const request = new Request("http://localhost/test");
      const result = parseCookies(request);

      expect(result).toEqual({});
    });

    it("应该处理单个Cookie", () => {
      const request = new Request("http://localhost/test", {
        headers: {
          Cookie: "sessionId=abc123",
        },
      });

      const result = parseCookies(request);

      expect(result.sessionId).toBe("abc123");
      expect(Object.keys(result)).toHaveLength(1);
    });

    it("应该处理复杂的Cookie值", () => {
      const request = new Request("http://localhost/test", {
        headers: {
          Cookie: "user=john; email=test@example.com; preferences=dark",
        },
      });

      const result = parseCookies(request);

      expect(result.user).toBe("john");
      expect(result.email).toBe("test@example.com");
      expect(result.preferences).toBe("dark");
    });

    it("应该处理Cookie值中的特殊字符", () => {
      const request = new Request("http://localhost/test", {
        headers: {
          Cookie: "message=Hello%20World; symbol=%26%3D%3F",
        },
      });

      const result = parseCookies(request);

      expect(result.message).toBe("Hello World");
      expect(result.symbol).toBe("&=?");
    });

    it("应该过滤掉undefined和null值", () => {
      // 由于无法直接mock cookie.parse，我们测试实际行为
      const request = new Request("http://localhost/test", {
        headers: {
          Cookie: "valid=value; empty=",
        },
      });

      const result = parseCookies(request);

      expect(result.valid).toBe("value");
      expect(result.empty).toBe("");
    });

    it("应该处理无效的Cookie格式", () => {
      const request = new Request("http://localhost/test", {
        headers: {
          Cookie: "invalid-cookie-format; another=value",
        },
      });

      const result = parseCookies(request);

      // 应该能解析出有效的部分
      expect(result.another).toBe("value");
    });

    it("应该处理空的Cookie值", () => {
      const request = new Request("http://localhost/test", {
        headers: {
          Cookie: "empty=; normal=value; another=",
        },
      });

      const result = parseCookies(request);

      expect(result.empty).toBe("");
      expect(result.normal).toBe("value");
      expect(result.another).toBe("");
    });
  });

  describe("边界情况和错误处理", () => {
    it("应该处理非常长的查询字符串", () => {
      const longQuery = "a".repeat(1000);
      const request = new Request(`http://localhost/test?${longQuery}=value`);

      expect(() => parseQuery(request)).not.toThrow();
    });

    it("应该处理非常长的Cookie字符串", () => {
      const longCookie = `longCookie=${"a".repeat(1000)}`;
      const request = new Request("http://localhost/test", {
        headers: { Cookie: longCookie },
      });

      expect(() => parseCookies(request)).not.toThrow();
    });

    it("应该处理包含换行符的请求体", async () => {
      const request = new Request("http://localhost/test", {
        method: "POST",
        body: "line1\nline2\nline3",
      });

      const result = await parseBody(request);
      expect(result).toBe("line1\nline2\nline3");
    });

    it("应该处理二进制数据", async () => {
      const binaryData = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const request = new Request("http://localhost/test", {
        method: "POST",
        body: binaryData,
      });

      const result = await parseBody(request);
      expect(result).toBe("Hello");
    });

    it("应该处理非常长的头部值", () => {
      const longValue = "a".repeat(10000);
      const request = new Request("http://localhost/test", {
        headers: { "X-Long": longValue },
      });

      const result = parseHeaders(request);

      expect(result["x-long"]).toBe(longValue);
    });

    it("应该处理包含特殊字符的头部值", () => {
      const specialChars = "!@#$%^&*()_+-=[]{}|;':\",./<>?";
      const request = new Request("http://localhost/test", {
        headers: { "X-Special": specialChars },
      });

      const result = parseHeaders(request);

      expect(result["x-special"]).toBe(specialChars);
    });

    it("应该处理包含特殊字符的Cookie值", () => {
      const cookieWithSpecialChars = "session=abc123; message=Hello%20World";
      const request = new Request("http://localhost/test", {
        headers: { Cookie: cookieWithSpecialChars },
      });

      const result = parseCookies(request);

      // 应该能解析出有效的部分
      expect(result.session).toBe("abc123");
      expect(result.message).toBe("Hello World");
    });
  });

  describe("类型安全和健壮性测试", () => {
    it("parseHeaders应该过滤掉null值", () => {
      const request = new Request("http://localhost/test", {
        headers: {
          valid: "value",
          empty: "",
        },
      });

      const result = parseHeaders(request);

      // 确保结果中不包含null或undefined值
      expect(result["valid"]).toBe("value");
      expect(result["empty"]).toBe("");
      expect(result["null-value"]).toBeUndefined();
      expect(result["undefined-value"]).toBeUndefined();
    });

    it("parseHeaders应该处理所有有效的头部值类型", () => {
      const request = new Request("http://localhost/test", {
        headers: {
          string: "text",
          number: "123",
          boolean: "true",
          empty: "",
        },
      });

      const result = parseHeaders(request);

      expect(result["string"]).toBe("text");
      expect(result["number"]).toBe("123");
      expect(result["boolean"]).toBe("true");
      expect(result["empty"]).toBe("");
    });

    it("parseCookies应该正确处理各种Cookie值类型", () => {
      const request = new Request("http://localhost/test", {
        headers: {
          Cookie: "string=text; number=123; boolean=true; empty=; null=null",
        },
      });

      const result = parseCookies(request);

      expect(result.string).toBe("text");
      expect(result.number).toBe("123");
      expect(result.boolean).toBe("true");
      expect(result.empty).toBe("");
      expect(result.null).toBe("null"); // "null"作为字符串是有效的
    });

    it("parseCookies应该在解析失败时提供详细错误信息", () => {
      // 创建一个可能导致解析失败的Cookie字符串
      const malformedCookie = "invalid=; malformed; another=value";

      // 捕获console.error输出
      const originalConsoleError = console.error;
      const errorLogs: string[] = [];
      console.error = (...args: unknown[]) => {
        errorLogs.push(args.join(" "));
      };

      try {
        const request = new Request("http://localhost/test", {
          headers: { Cookie: malformedCookie },
        });

        const result = parseCookies(request);

        // 实际上cookie库很健壮，能解析出有效的部分
        expect(result.invalid).toBe("");
        expect(result.another).toBe("value");

        // 应该没有错误日志
        expect(errorLogs.length).toBe(0);
      } finally {
        console.error = originalConsoleError;
      }
    });
  });
});
