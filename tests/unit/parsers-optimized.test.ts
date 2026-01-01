// tests/unit/parsers-optimized.test.ts
/**
 * 请求解析器优化测试
 */

import { describe, it, expect } from "vitest";
import {
  parseQuery,
  parseQueryFast,
  parseHeaders,
  getHeader,
  parseCookies,
  parseCookiesFast,
  getCookie,
} from "../../src/utils/parsers";

describe("请求解析器优化测试", () => {
  describe("parseQuery 功能测试", () => {
    it("应该正确解析简单查询字符串", () => {
      const req = new Request("http://localhost/test?name=john&age=30");
      const query = parseQuery(req);
      expect(query.name).toBe("john");
      expect(query.age).toBe("30");
    });

    it("应该处理空查询字符串", () => {
      const req = new Request("http://localhost/test");
      const query = parseQuery(req);
      expect(Object.keys(query).length).toBe(0);
    });

    it("应该处理带 hash 的 URL", () => {
      const req = new Request("http://localhost/test?name=john#section");
      const query = parseQuery(req);
      expect(query.name).toBe("john");
    });

    it("应该支持嵌套查询参数（qs 功能）", () => {
      const req = new Request(
        "http://localhost/test?user[name]=john&user[age]=30",
      );
      const query = parseQuery(req);
      expect(query.user).toEqual({ name: "john", age: "30" });
    });
  });

  describe("parseQueryFast 功能测试", () => {
    it("应该正确解析简单查询字符串", () => {
      const req = new Request("http://localhost/test?name=john&age=30");
      const query = parseQueryFast(req);
      expect(query.name).toBe("john");
      expect(query.age).toBe("30");
    });

    it("应该处理 URL 编码", () => {
      const req = new Request(
        "http://localhost/test?name=%E5%BC%A0%E4%B8%89&city=%E5%8C%97%E4%BA%AC",
      );
      const query = parseQueryFast(req);
      expect(query.name).toBe("张三");
      expect(query.city).toBe("北京");
    });

    it("应该处理空值", () => {
      const req = new Request("http://localhost/test?empty&name=john");
      const query = parseQueryFast(req);
      expect(query.empty).toBe("");
      expect(query.name).toBe("john");
    });
  });

  describe("parseHeaders 功能测试", () => {
    it("应该正确解析请求头", () => {
      const req = new Request("http://localhost/test", {
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token123",
        },
      });
      const headers = parseHeaders(req);
      expect(headers["content-type"]).toBe("application/json");
      expect(headers["authorization"]).toBe("Bearer token123");
    });
  });

  describe("getHeader 功能测试", () => {
    it("应该获取单个请求头", () => {
      const req = new Request("http://localhost/test", {
        headers: {
          "Content-Type": "application/json",
          "X-Custom": "value",
        },
      });
      expect(getHeader(req, "Content-Type")).toBe("application/json");
      expect(getHeader(req, "X-Custom")).toBe("value");
      expect(getHeader(req, "Not-Exist")).toBeNull();
    });
  });

  describe("parseCookies 功能测试", () => {
    it("应该正确解析 Cookie", () => {
      const req = new Request("http://localhost/test", {
        headers: {
          Cookie: "session=abc123; user=john",
        },
      });
      const cookies = parseCookies(req);
      expect(cookies.session).toBe("abc123");
      expect(cookies.user).toBe("john");
    });

    it("应该处理空 Cookie", () => {
      const req = new Request("http://localhost/test");
      const cookies = parseCookies(req);
      expect(Object.keys(cookies).length).toBe(0);
    });
  });

  describe("parseCookiesFast 功能测试", () => {
    it("应该正确解析简单 Cookie", () => {
      const req = new Request("http://localhost/test", {
        headers: {
          Cookie: "session=abc123; user=john",
        },
      });
      const cookies = parseCookiesFast(req);
      expect(cookies.session).toBe("abc123");
      expect(cookies.user).toBe("john");
    });

    it("应该处理带引号的值", () => {
      const req = new Request("http://localhost/test", {
        headers: {
          Cookie: 'token="quoted-value"; name=simple',
        },
      });
      const cookies = parseCookiesFast(req);
      expect(cookies.token).toBe("quoted-value");
      expect(cookies.name).toBe("simple");
    });
  });

  describe("getCookie 功能测试", () => {
    it("应该获取单个 Cookie", () => {
      const req = new Request("http://localhost/test", {
        headers: {
          Cookie: "session=abc123; user=john; token=xyz",
        },
      });
      expect(getCookie(req, "session")).toBe("abc123");
      expect(getCookie(req, "user")).toBe("john");
      expect(getCookie(req, "not-exist")).toBeNull();
    });
  });

  describe("性能对比测试", () => {
    it("parseQuery vs parseQueryFast 性能对比", () => {
      const iterations = 10000;
      const url =
        "http://localhost/test?name=john&age=30&city=beijing&active=true";

      // parseQuery 测试
      const start1 = performance.now();
      for (let i = 0; i < iterations; i++) {
        const req = new Request(url);
        parseQuery(req);
      }
      const end1 = performance.now();

      // parseQueryFast 测试
      const start2 = performance.now();
      for (let i = 0; i < iterations; i++) {
        const req = new Request(url);
        parseQueryFast(req);
      }
      const end2 = performance.now();

      const time1 = end1 - start1;
      const time2 = end2 - start2;
      const speedup = (time1 / time2).toFixed(2);

      console.log(
        `\n========== Query 解析性能对比 (${iterations} 次) ==========`,
      );
      console.log(
        `parseQuery:     ${time1.toFixed(2)}ms (${(time1 / iterations).toFixed(3)}ms/次)`,
      );
      console.log(
        `parseQueryFast: ${time2.toFixed(2)}ms (${(time2 / iterations).toFixed(3)}ms/次)`,
      );
      console.log(`快了 ${speedup}x`);
      console.log(`================================================\n`);

      expect(time2).toBeLessThan(time1 * 1.5); // 允许波动
    });

    it("parseCookies vs parseCookiesFast 性能对比", () => {
      const iterations = 10000;
      const cookieHeader =
        "session=abc123; user=john; token=xyz789; lang=zh-CN; theme=dark";

      // parseCookies 测试
      const start1 = performance.now();
      for (let i = 0; i < iterations; i++) {
        const req = new Request("http://localhost/test", {
          headers: { Cookie: cookieHeader },
        });
        parseCookies(req);
      }
      const end1 = performance.now();

      // parseCookiesFast 测试
      const start2 = performance.now();
      for (let i = 0; i < iterations; i++) {
        const req = new Request("http://localhost/test", {
          headers: { Cookie: cookieHeader },
        });
        parseCookiesFast(req);
      }
      const end2 = performance.now();

      const time1 = end1 - start1;
      const time2 = end2 - start2;
      const speedup = (time1 / time2).toFixed(2);

      console.log(
        `\n========== Cookie 解析性能对比 (${iterations} 次) ==========`,
      );
      console.log(
        `parseCookies:     ${time1.toFixed(2)}ms (${(time1 / iterations).toFixed(3)}ms/次)`,
      );
      console.log(
        `parseCookiesFast: ${time2.toFixed(2)}ms (${(time2 / iterations).toFixed(3)}ms/次)`,
      );
      console.log(`快了 ${speedup}x`);
      console.log(`================================================\n`);

      expect(time2).toBeLessThan(time1 * 1.5);
    });

    it("getCookie vs parseCookies 单值获取性能对比", () => {
      const iterations = 10000;
      const cookieHeader =
        "session=abc123; user=john; token=xyz789; lang=zh-CN; theme=dark";

      // parseCookies + 取值 测试
      const start1 = performance.now();
      for (let i = 0; i < iterations; i++) {
        const req = new Request("http://localhost/test", {
          headers: { Cookie: cookieHeader },
        });
        const cookies = parseCookies(req);
        const _ = cookies.token;
      }
      const end1 = performance.now();

      // getCookie 测试
      const start2 = performance.now();
      for (let i = 0; i < iterations; i++) {
        const req = new Request("http://localhost/test", {
          headers: { Cookie: cookieHeader },
        });
        getCookie(req, "token");
      }
      const end2 = performance.now();

      const time1 = end1 - start1;
      const time2 = end2 - start2;
      const speedup = (time1 / time2).toFixed(2);

      console.log(
        `\n========== 单个 Cookie 获取性能对比 (${iterations} 次) ==========`,
      );
      console.log(
        `parseCookies + 取值: ${time1.toFixed(2)}ms (${(time1 / iterations).toFixed(3)}ms/次)`,
      );
      console.log(
        `getCookie:           ${time2.toFixed(2)}ms (${(time2 / iterations).toFixed(3)}ms/次)`,
      );
      console.log(`快了 ${speedup}x`);
      console.log(`================================================\n`);

      expect(time2).toBeLessThan(time1 * 1.5);
    });
  });
});
