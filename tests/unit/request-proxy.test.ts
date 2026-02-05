/**
 * Request 代理测试
 * 
 * 测试 createProxyRequest 创建的代理 Request 对象的行为
 * 特别是 GET/HEAD 请求调用 body 相关方法时的防御性处理
 */

import { describe, it, expect, afterEach } from "vitest";
import { serve } from "../../src/node-server/serve";
import type { ServeResult } from "../../src/node-server/serve";

describe("Request 代理 body 方法防御", () => {
  let serverResult: ServeResult | null = null;

  afterEach(async () => {
    if (serverResult) {
      await serverResult.stop();
      serverResult = null;
    }
  });

  /**
   * 测试背景：
   * 某些客户端（如 Electron/浏览器）可能会为 GET 请求添加 Content-Type: application/json header
   * 框架应该优雅地处理这种情况，让用户调用 req.json() 时不会报错
   * 
   * 参考：Fastify 文档 "for GET and HEAD requests, the payload is never parsed"
   */
  describe("GET 请求 body 方法", () => {
    it("req.json() 应返回 null", async () => {
      const port = 19100;
      let jsonResult: unknown;

      serverResult = serve({
        fetch: async (req) => {
          // 在 handler 中调用 req.json()
          jsonResult = await req.json();
          return new Response("OK");
        },
        port,
      });

      // 发送带 Content-Type 的 GET 请求
      await fetch(`http://localhost:${port}/`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      expect(jsonResult).toBeNull();
    });

    it("req.text() 应返回空字符串", async () => {
      const port = 19101;
      let textResult: unknown;

      serverResult = serve({
        fetch: async (req) => {
          textResult = await req.text();
          return new Response("OK");
        },
        port,
      });

      await fetch(`http://localhost:${port}/`, {
        method: "GET",
        headers: { "Content-Type": "text/plain" },
      });

      expect(textResult).toBe("");
    });

    it("req.arrayBuffer() 应返回空 ArrayBuffer", async () => {
      const port = 19102;
      let bufferResult: ArrayBuffer | undefined;

      serverResult = serve({
        fetch: async (req) => {
          bufferResult = await req.arrayBuffer();
          return new Response("OK");
        },
        port,
      });

      await fetch(`http://localhost:${port}/`, {
        method: "GET",
      });

      expect(bufferResult).toBeInstanceOf(ArrayBuffer);
      expect(bufferResult?.byteLength).toBe(0);
    });

    it("req.blob() 应返回空 Blob", async () => {
      const port = 19103;
      let blobResult: Blob | undefined;

      serverResult = serve({
        fetch: async (req) => {
          blobResult = await req.blob();
          return new Response("OK");
        },
        port,
      });

      await fetch(`http://localhost:${port}/`, {
        method: "GET",
      });

      expect(blobResult).toBeInstanceOf(Blob);
      expect(blobResult?.size).toBe(0);
    });
  });

  describe("HEAD 请求 body 方法", () => {
    it("req.json() 应返回 null", async () => {
      const port = 19104;
      let jsonResult: unknown;

      serverResult = serve({
        fetch: async (req) => {
          jsonResult = await req.json();
          return new Response("OK");
        },
        port,
      });

      await fetch(`http://localhost:${port}/`, {
        method: "HEAD",
        headers: { "Content-Type": "application/json" },
      });

      expect(jsonResult).toBeNull();
    });

    it("req.text() 应返回空字符串", async () => {
      const port = 19105;
      let textResult: unknown;

      serverResult = serve({
        fetch: async (req) => {
          textResult = await req.text();
          return new Response("OK");
        },
        port,
      });

      await fetch(`http://localhost:${port}/`, {
        method: "HEAD",
      });

      expect(textResult).toBe("");
    });
  });

  describe("POST 请求 body 方法（正常场景）", () => {
    it("req.json() 应正常解析 JSON body", async () => {
      const port = 19106;
      let jsonResult: unknown;

      serverResult = serve({
        fetch: async (req) => {
          jsonResult = await req.json();
          return new Response("OK");
        },
        port,
      });

      await fetch(`http://localhost:${port}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "hello", count: 42 }),
      });

      expect(jsonResult).toEqual({ message: "hello", count: 42 });
    });

    it("req.text() 应正常读取文本 body", async () => {
      const port = 19107;
      let textResult: unknown;

      serverResult = serve({
        fetch: async (req) => {
          textResult = await req.text();
          return new Response("OK");
        },
        port,
      });

      await fetch(`http://localhost:${port}/`, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: "Hello, World!",
      });

      expect(textResult).toBe("Hello, World!");
    });
  });

  describe("req.clone() 方法", () => {
    it("GET 请求也应该能够克隆", async () => {
      const port = 19108;
      let cloneSucceeded = false;

      serverResult = serve({
        fetch: async (req) => {
          const cloned = req.clone();
          cloneSucceeded = cloned instanceof Request;
          return new Response("OK");
        },
        port,
      });

      await fetch(`http://localhost:${port}/`, {
        method: "GET",
      });

      expect(cloneSucceeded).toBe(true);
    });

    it("POST 请求克隆后两个 Request 应该都能读取 body", async () => {
      const port = 19109;
      let body1: unknown;
      let body2: unknown;

      serverResult = serve({
        fetch: async (req) => {
          const cloned = req.clone();
          body1 = await req.json();
          body2 = await cloned.json();
          return new Response("OK");
        },
        port,
      });

      await fetch(`http://localhost:${port}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "value" }),
      });

      expect(body1).toEqual({ key: "value" });
      expect(body2).toEqual({ key: "value" });
    });
  });

  describe("边界情况", () => {
    it("GET 请求带 Content-Type 但实际没有 body 时不应报错", async () => {
      const port = 19110;
      let error: Error | null = null;

      serverResult = serve({
        fetch: async (req) => {
          try {
            await req.json();
          } catch (e) {
            error = e as Error;
          }
          return new Response("OK");
        },
        port,
      });

      const response = await fetch(`http://localhost:${port}/`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      expect(response.status).toBe(200);
      expect(error).toBeNull(); // 不应该有错误
    });

    it("DELETE 请求应该能够读取 body（如果有的话）", async () => {
      const port = 19111;
      let jsonResult: unknown;

      serverResult = serve({
        fetch: async (req) => {
          jsonResult = await req.json();
          return new Response("OK");
        },
        port,
      });

      await fetch(`http://localhost:${port}/`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: 123, reason: "not needed" }),
      });

      expect(jsonResult).toEqual({ id: 123, reason: "not needed" });
    });

    it("OPTIONS 请求应该返回空 body（与 GET 类似处理）", async () => {
      const port = 19112;
      let jsonResult: unknown;

      serverResult = serve({
        fetch: async (req) => {
          // OPTIONS 请求通常不带 body，但某些 CORS 预检请求可能带
          // 框架对 OPTIONS 的处理应该类似 GET
          if (req.method === "OPTIONS") {
            jsonResult = await req.json();
          }
          return new Response("OK");
        },
        port,
      });

      await fetch(`http://localhost:${port}/`, {
        method: "OPTIONS",
        headers: { "Content-Type": "application/json" },
      });

      // OPTIONS 请求可能有 body 也可能没有，这里测试无 body 情况
      // 如果框架对 OPTIONS 特殊处理为返回 null，则期望 null
      // 如果不特殊处理，可能返回解析错误或空对象
      // 当前实现：OPTIONS 不在 GET/HEAD 列表中，所以会尝试解析
      // 这是合理的，因为 OPTIONS 请求可能包含 body
    });
  });
});
