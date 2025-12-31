/**
 * 处理器微基准测试
 *
 * 测试 createHandler 和请求处理性能
 */

import { BenchSuite } from "../lib/bench";
import { createHandler, simpleHandler } from "../../src/utils/create-handler";
import { Type } from "@sinclair/typebox";

async function main() {
  console.log("🚀 处理器微基准测试");
  console.log("=".repeat(50));

  // 准备 Schema
  const UserSchema = Type.Object({
    name: Type.String(),
    email: Type.String(),
    age: Type.Number(),
  });

  const QuerySchema = Type.Object({
    page: Type.Optional(Type.String()),
    limit: Type.Optional(Type.String()),
  });

  // 准备处理器
  const rawHandler = () => new Response("OK");

  const simpleH = simpleHandler(() => ({ message: "OK" }));

  const noSchemaHandler = createHandler({})(() => ({ message: "OK" }));

  const querySchemaHandler = createHandler({
    query: QuerySchema,
  })(({ query }) => ({
    page: query.page || "1",
    limit: query.limit || "10",
  }));

  const bodySchemaHandler = createHandler({
    body: UserSchema,
  })(({ body }) => ({
    id: 1,
    name: body.name,
    email: body.email,
  }));

  const suite = new BenchSuite("处理器性能测试");

  // 1. 原生 Response
  await suite.add(
    { name: "原生 Response", iterations: 100000 },
    () => {
      rawHandler();
    }
  );

  // 2. simpleHandler
  await suite.add(
    { name: "simpleHandler", iterations: 50000 },
    async () => {
      const req = new Request("http://localhost/");
      await simpleH(req);
    }
  );

  // 3. createHandler 无 Schema
  await suite.add(
    { name: "createHandler (无 Schema)", iterations: 50000 },
    async () => {
      const req = new Request("http://localhost/");
      await noSchemaHandler(req);
    }
  );

  // 4. createHandler 带 Query Schema
  await suite.add(
    { name: "createHandler (Query Schema)", iterations: 50000 },
    async () => {
      const req = new Request("http://localhost/?page=1&limit=10");
      await querySchemaHandler(req);
    }
  );

  // 5. createHandler 带 Body Schema
  await suite.add(
    { name: "createHandler (Body Schema)", iterations: 20000 },
    async () => {
      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Alice",
          email: "alice@example.com",
          age: 25,
        }),
      });
      await bodySchemaHandler(req);
    }
  );

  suite.print();

  // 响应类型转换测试
  console.log("\n" + "=".repeat(50));
  console.log("📊 响应类型转换测试");
  console.log("=".repeat(50));

  const responseSuite = new BenchSuite("响应转换性能");

  // 对象返回
  const objectHandler = createHandler({})(() => ({
    success: true,
    data: { id: 1, name: "test" },
  }));

  await responseSuite.add(
    { name: "对象 -> JSON Response", iterations: 50000 },
    async () => {
      const req = new Request("http://localhost/");
      await objectHandler(req);
    }
  );

  // 字符串返回
  const stringHandler = createHandler({})(() => "Hello World");

  await responseSuite.add(
    { name: "字符串 -> Text Response", iterations: 50000 },
    async () => {
      const req = new Request("http://localhost/");
      await stringHandler(req);
    }
  );

  // Response 直接返回
  const responseHandler = createHandler({})(() => new Response("OK"));

  await responseSuite.add(
    { name: "Response 直传", iterations: 50000 },
    async () => {
      const req = new Request("http://localhost/");
      await responseHandler(req);
    }
  );

  // { data, status, headers } 格式
  const customHandler = createHandler({})(() => ({
    data: { id: 1 },
    status: 201,
    headers: { "X-Custom": "value" },
  }));

  await responseSuite.add(
    { name: "{ data, status, headers } 格式", iterations: 50000 },
    async () => {
      const req = new Request("http://localhost/");
      await customHandler(req);
    }
  );

  responseSuite.print();
}

main().catch(console.error);

