import { describe, it, expect, beforeEach } from "vitest";
import { Server } from "../../src";
import type { Route } from "../../src";

describe("Vafast Server", () => {
  let server: Server;
  let routes: Route[];

  beforeEach(() => {
    routes = [
      {
        method: "GET",
        path: "/test",
        handler: (req) =>
          new Response("test", {
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          }),
      },
      {
        method: "POST",
        path: "/test",
        handler: (req) =>
          new Response("post test", {
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          }),
      },
    ];
    server = new Server(routes);
  });

  it("应该创建一个新的服务器实例", () => {
    expect(server).toBeInstanceOf(Server);
  });

  it("应该处理 GET 请求", () => {
    const request = new Request("http://localhost/test", { method: "GET" });
    const response = server.fetch(request);
    expect(response).toBeDefined();
  });

  it("应该处理 POST 请求", () => {
    const request = new Request("http://localhost/test", { method: "POST" });
    const response = server.fetch(request);
    expect(response).toBeDefined();
  });

  it("应该为不存在的路由返回 404", async () => {
    const request = new Request("http://localhost/nonexistent", {
      method: "GET",
    });
    const response = await server.fetch(request);
    expect(response.status).toBe(404);
  });
});
