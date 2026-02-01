import { describe, it, expect, afterEach } from "vitest";
import { serve } from "../../src/node-server/serve";
import type { ServeResult } from "../../src/node-server/serve";

describe("serve 配置功能", () => {
  let serverResult: ServeResult | null = null;

  afterEach(async () => {
    if (serverResult) {
      await serverResult.stop();
      serverResult = null;
    }
  });

  describe("requestTimeout", () => {
    it("应该在超时后返回 504", async () => {
      const port = 19001;

      serverResult = serve({
        fetch: async () => {
          // 模拟慢请求，等待 200ms
          await new Promise((resolve) => setTimeout(resolve, 200));
          return new Response("OK");
        },
        port,
        timeout: {
          requestTimeout: 100, // 100ms 超时
        },
      });

      const response = await fetch(`http://localhost:${port}/`);

      expect(response.status).toBe(504);
      const body = await response.json();
      expect(body.code).toBe(504);
      expect(body.message).toBe("Request timeout");
    });

    it("应该在超时时间内正常返回", async () => {
      const port = 19002;

      serverResult = serve({
        fetch: async () => {
          // 快速请求，50ms
          await new Promise((resolve) => setTimeout(resolve, 50));
          return new Response("OK");
        },
        port,
        timeout: {
          requestTimeout: 200, // 200ms 超时
        },
      });

      const response = await fetch(`http://localhost:${port}/`);

      expect(response.status).toBe(200);
      expect(await response.text()).toBe("OK");
    });

    it("应该支持自定义超时响应", async () => {
      const port = 19003;

      serverResult = serve({
        fetch: async () => {
          await new Promise((resolve) => setTimeout(resolve, 200));
          return new Response("OK");
        },
        port,
        timeout: {
          requestTimeout: 100,
          timeoutResponse: {
            code: 504,
            message: "请求超时，请稍后重试",
          },
        },
      });

      const response = await fetch(`http://localhost:${port}/`);

      expect(response.status).toBe(504);
      const body = await response.json();
      expect(body.message).toBe("请求超时，请稍后重试");
    });

    it("不设置 requestTimeout 时请求不应超时", async () => {
      const port = 19004;

      serverResult = serve({
        fetch: async () => {
          // 等待 100ms
          await new Promise((resolve) => setTimeout(resolve, 100));
          return new Response("OK");
        },
        port,
        // 不设置 timeout
      });

      const response = await fetch(`http://localhost:${port}/`);

      expect(response.status).toBe(200);
      expect(await response.text()).toBe("OK");
    });

    it("requestTimeout 为 0 时请求不应超时", async () => {
      const port = 19005;

      serverResult = serve({
        fetch: async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return new Response("OK");
        },
        port,
        timeout: {
          requestTimeout: 0, // 显式设置为 0
        },
      });

      const response = await fetch(`http://localhost:${port}/`);

      expect(response.status).toBe(200);
      expect(await response.text()).toBe("OK");
    });
  });

  describe("gracefulShutdown", () => {
    it("应该支持 gracefulShutdown: true 简写", async () => {
      const port = 19006;

      serverResult = serve({
        fetch: () => new Response("OK"),
        port,
        gracefulShutdown: true,
      });

      const response = await fetch(`http://localhost:${port}/`);
      expect(response.status).toBe(200);

      // 调用 shutdown 应该正常工作
      await serverResult.shutdown();
      serverResult = null; // 已关闭，避免 afterEach 再次关闭
    });

    it("应该支持 gracefulShutdown 配置对象", async () => {
      const port = 19007;
      let shutdownCalled = false;
      let shutdownCompleteCalled = false;

      serverResult = serve({
        fetch: () => new Response("OK"),
        port,
        gracefulShutdown: {
          timeout: 5000,
          onShutdown: () => {
            shutdownCalled = true;
          },
          onShutdownComplete: () => {
            shutdownCompleteCalled = true;
          },
        },
      });

      const response = await fetch(`http://localhost:${port}/`);
      expect(response.status).toBe(200);

      await serverResult.shutdown();

      expect(shutdownCalled).toBe(true);
      expect(shutdownCompleteCalled).toBe(true);

      serverResult = null;
    });
  });

  describe("bodyLimit", () => {
    it("应该在请求体超过限制时返回 413", async () => {
      const port = 19008;

      serverResult = serve({
        fetch: async (req) => {
          const body = await req.text();
          return new Response(`Received: ${body.length} bytes`);
        },
        port,
        bodyLimit: 100, // 100 字节限制
      });

      // 发送超过限制的请求体
      const largeBody = "x".repeat(200);
      const response = await fetch(`http://localhost:${port}/`, {
        method: "POST",
        body: largeBody,
        headers: { "Content-Length": String(largeBody.length) },
      });

      expect(response.status).toBe(413);
      const body = await response.json();
      expect(body.code).toBe(413);
      expect(body.message).toBe("Payload Too Large");
      expect(body.limit).toBe(100);
    });

    it("应该在请求体未超过限制时正常处理", async () => {
      const port = 19009;

      serverResult = serve({
        fetch: async (req) => {
          const body = await req.text();
          return new Response(`Received: ${body.length} bytes`);
        },
        port,
        bodyLimit: 1000, // 1000 字节限制
      });

      const smallBody = "x".repeat(100);
      const response = await fetch(`http://localhost:${port}/`, {
        method: "POST",
        body: smallBody,
      });

      expect(response.status).toBe(200);
      expect(await response.text()).toBe("Received: 100 bytes");
    });

    it("应该使用默认的 1MB 限制", async () => {
      const port = 19010;

      serverResult = serve({
        fetch: async (req) => {
          const body = await req.text();
          return new Response(`Received: ${body.length} bytes`);
        },
        port,
        // 不设置 bodyLimit，使用默认值
      });

      // 发送小于 1MB 的请求应该成功
      const smallBody = "x".repeat(1000);
      const response = await fetch(`http://localhost:${port}/`, {
        method: "POST",
        body: smallBody,
      });

      expect(response.status).toBe(200);
    });

    it("bodyLimit 为 0 时应该不限制", async () => {
      const port = 19011;

      serverResult = serve({
        fetch: async (req) => {
          const body = await req.text();
          return new Response(`Received: ${body.length} bytes`);
        },
        port,
        bodyLimit: 0, // 不限制
      });

      // 发送大请求应该成功
      const largeBody = "x".repeat(2000);
      const response = await fetch(`http://localhost:${port}/`, {
        method: "POST",
        body: largeBody,
        headers: { "Content-Length": String(largeBody.length) },
      });

      expect(response.status).toBe(200);
      expect(await response.text()).toBe("Received: 2000 bytes");
    });

    it("GET 请求不应受 bodyLimit 影响", async () => {
      const port = 19012;

      serverResult = serve({
        fetch: () => new Response("OK"),
        port,
        bodyLimit: 10, // 很小的限制
      });

      const response = await fetch(`http://localhost:${port}/`);

      expect(response.status).toBe(200);
      expect(await response.text()).toBe("OK");
    });
  });

  describe("trustProxy", () => {
    it("trustProxy: true 时应该从 X-Forwarded-For 获取 IP", async () => {
      const port = 19013;

      serverResult = serve({
        fetch: (req) => {
          const ip = (req as any).ip;
          const ips = (req as any).ips;
          return new Response(JSON.stringify({ ip, ips }), {
            headers: { "Content-Type": "application/json" },
          });
        },
        port,
        trustProxy: true,
      });

      const response = await fetch(`http://localhost:${port}/`, {
        headers: { "X-Forwarded-For": "1.2.3.4, 5.6.7.8" },
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.ip).toBe("1.2.3.4");
      expect(body.ips).toEqual(["1.2.3.4", "5.6.7.8"]);
    });

    it("trustProxy: true 时应该支持 X-Real-IP", async () => {
      const port = 19014;

      serverResult = serve({
        fetch: (req) => {
          const ip = (req as any).ip;
          return new Response(JSON.stringify({ ip }), {
            headers: { "Content-Type": "application/json" },
          });
        },
        port,
        trustProxy: true,
      });

      const response = await fetch(`http://localhost:${port}/`, {
        headers: { "X-Real-IP": "10.20.30.40" },
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.ip).toBe("10.20.30.40");
    });

    it("trustProxy: true 时应该支持 CF-Connecting-IP", async () => {
      const port = 19015;

      serverResult = serve({
        fetch: (req) => {
          const ip = (req as any).ip;
          return new Response(JSON.stringify({ ip }), {
            headers: { "Content-Type": "application/json" },
          });
        },
        port,
        trustProxy: true,
      });

      const response = await fetch(`http://localhost:${port}/`, {
        headers: { "CF-Connecting-IP": "203.0.113.195" },
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.ip).toBe("203.0.113.195");
    });

    it("trustProxy: false 时不应该信任代理头", async () => {
      const port = 19016;

      serverResult = serve({
        fetch: (req) => {
          const ip = (req as any).ip;
          return new Response(JSON.stringify({ ip }), {
            headers: { "Content-Type": "application/json" },
          });
        },
        port,
        trustProxy: false,
      });

      const response = await fetch(`http://localhost:${port}/`, {
        headers: { "X-Forwarded-For": "1.2.3.4" },
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      // 应该是 socket IP（localhost），不是 X-Forwarded-For 的值
      expect(body.ip).not.toBe("1.2.3.4");
    });

    it("不设置 trustProxy 时应该使用 socket IP", async () => {
      const port = 19017;

      serverResult = serve({
        fetch: (req) => {
          const ip = (req as any).ip;
          return new Response(JSON.stringify({ ip }), {
            headers: { "Content-Type": "application/json" },
          });
        },
        port,
        // 不设置 trustProxy
      });

      const response = await fetch(`http://localhost:${port}/`, {
        headers: { "X-Forwarded-For": "1.2.3.4" },
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      // 应该是 socket IP，不是 X-Forwarded-For 的值
      expect(body.ip).not.toBe("1.2.3.4");
      // ip 应该有值（本地测试通常是 ::1 或 127.0.0.1）
      expect(body.ip).toBeTruthy();
    });

    it("X-Forwarded-For 优先级高于 X-Real-IP", async () => {
      const port = 19018;

      serverResult = serve({
        fetch: (req) => {
          const ip = (req as any).ip;
          return new Response(JSON.stringify({ ip }), {
            headers: { "Content-Type": "application/json" },
          });
        },
        port,
        trustProxy: true,
      });

      const response = await fetch(`http://localhost:${port}/`, {
        headers: {
          "X-Forwarded-For": "1.1.1.1",
          "X-Real-IP": "2.2.2.2",
        },
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.ip).toBe("1.1.1.1");
    });
  });
});
