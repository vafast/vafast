import { describe, it, expect } from "vitest";
import { Type } from "@sinclair/typebox";
import { Server } from "../../src";
import { defineRoute, defineRoutes } from "../../src/defineRoute";

describe("Schema 校验 HTTP 响应", () => {
  const routes = defineRoutes([
    defineRoute({
      method: "POST",
      path: "/invoice/apply",
      schema: {
        body: Type.Object({
          invoiceType: Type.String(),
          email: Type.String({ format: "email" }),
          receiver: Type.Object({
            name: Type.String({ minLength: 1 }),
          }),
          orderIds: Type.Array(Type.String({ minLength: 24 })),
        }),
      },
      handler: ({ body }) => ({ ok: true, email: body.email }),
    }),
    defineRoute({
      method: "GET",
      path: "/orders",
      schema: {
        query: Type.Object({
          page: Type.Number({ minimum: 1 }),
        }),
      },
      handler: ({ query }) => ({ page: query.page }),
    }),
  ]);

  const server = new Server(routes);

  it("嵌套 body 校验失败返回 422 + details", async () => {
    const response = await server.fetch(
      new Request("http://localhost/invoice/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceType: "personal",
          email: "2212",
          receiver: { name: "" },
          orderIds: ["short-id"],
        }),
      }),
    );

    expect(response.status).toBe(422);

    const data = await response.json();
    expect(data).toMatchObject({
      code: 422,
      message: "请求参数校验失败",
    });
    expect(Array.isArray(data.details)).toBe(true);
    expect(data.details.length).toBeGreaterThan(0);

    const emailDetail = data.details.find(
      (d: { path: string }) => d.path === "/email",
    );
    expect(emailDetail).toMatchObject({
      location: "body",
      field: "email",
    });
    expect(emailDetail.message).toContain("email");

    const nestedDetail = data.details.find(
      (d: { path: string }) => d.path === "/receiver/name",
    );
    expect(nestedDetail?.field).toBe("receiver.name");

    const arrayDetail = data.details.find(
      (d: { path: string }) => d.path === "/orderIds/0",
    );
    expect(arrayDetail?.field).toBe("orderIds.0");
  });

  it("query 校验失败返回 422 + details", async () => {
    const response = await server.fetch(
      new Request("http://localhost/orders?page=abc", { method: "GET" }),
    );

    expect(response.status).toBe(422);
    const data = await response.json();
    expect(data.code).toBe(422);
    expect(data.details[0]).toMatchObject({
      location: "query",
      field: "page",
    });
  });

  it("校验通过时返回业务数据", async () => {
    const response = await server.fetch(
      new Request("http://localhost/invoice/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceType: "personal",
          email: "user@example.com",
          receiver: { name: "张三" },
          orderIds: ["0123456789012345678901234"],
        }),
      }),
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.ok).toBe(true);
    expect(data.email).toBe("user@example.com");
  });
});
