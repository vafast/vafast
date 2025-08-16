// example/advanced/schema-validation.ts
import { Type } from "@sinclair/typebox";
import { validateSchema } from "../../src/utils/validators";

// 定义用户Schema
const UserSchema = Type.Object({
  id: Type.Number(),
  name: Type.String(),
  email: Type.String(),
  age: Type.Optional(Type.Number({ minimum: 0, maximum: 150 })),
  tags: Type.Array(Type.String()),
});

// 定义查询参数Schema
const QuerySchema = Type.Object({
  page: Type.Optional(Type.Number({ minimum: 1 })),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100 })),
  search: Type.Optional(Type.String()),
});

// 定义请求头Schema
const HeadersSchema = Type.Object({
  "user-agent": Type.String(),
  authorization: Type.Optional(Type.String()),
  "content-type": Type.String(),
});

// 模拟验证HTTP请求的各个部分
function validateRequest(data: { body: unknown; query: unknown; headers: unknown }) {
  console.log("=== 验证请求体 ===");
  const bodyResult = validateSchema(UserSchema, data.body);
  if (bodyResult.success) {
    console.log("✅ 请求体验证成功:", bodyResult.data);
  } else {
    console.log("❌ 请求体验证失败:");
    bodyResult.errors.forEach((error, index) => {
      console.log(`  错误 ${index + 1}:`);
      console.log(`    路径: ${error.path || "root"}`);
      console.log(`    消息: ${error.message}`);
      console.log(`    值: ${JSON.stringify(error.value)}`);
      if (error.schema) {
        console.log(`    Schema: ${JSON.stringify(error.schema)}`);
      }
    });
  }

  console.log("\n=== 验证查询参数 ===");
  const queryResult = validateSchema(QuerySchema, data.query);
  if (queryResult.success) {
    console.log("✅ 查询参数验证成功:", queryResult.data);
  } else {
    console.log("❌ 查询参数验证失败:");
    queryResult.errors.forEach((error, index) => {
      console.log(`  错误 ${index + 1}:`);
      console.log(`    路径: ${error.path || "root"}`);
      console.log(`    消息: ${error.message}`);
      console.log(`    值: ${JSON.stringify(error.value)}`);
    });
  }

  console.log("\n=== 验证请求头 ===");
  const headersResult = validateSchema(HeadersSchema, data.headers);
  if (headersResult.success) {
    console.log("✅ 请求头验证成功:", headersResult.data);
  } else {
    console.log("❌ 请求头验证失败:");
    headersResult.errors.forEach((error, index) => {
      console.log(`  错误 ${index + 1}:`);
      console.log(`    路径: ${error.path || "root"}`);
      console.log(`    消息: ${error.message}`);
      console.log(`    值: ${JSON.stringify(error.value)}`);
    });
  }
}

// 测试用例
console.log("🚀 开始验证测试\n");

// 测试1: 有效数据
console.log("📝 测试1: 有效数据");
validateRequest({
  body: {
    id: 1,
    name: "张三",
    email: "zhangsan@example.com",
    age: 25,
    tags: ["developer", "typescript"],
  },
  query: {
    page: 1,
    limit: 20,
    search: "typescript",
  },
  headers: {
    "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    authorization: "Bearer token123",
    "content-type": "application/json",
  },
});

console.log("\n" + "=".repeat(50) + "\n");

// 测试2: 无效数据
console.log("📝 测试2: 无效数据");
validateRequest({
  body: {
    id: "invalid-id", // 应该是数字
    name: "李四",
    // 缺少email字段
    age: 200, // 超出范围
    tags: "not-an-array", // 应该是数组
  },
  query: {
    page: 0, // 应该 >= 1
    limit: 200, // 应该 <= 100
    search: 123, // 应该是字符串
  },
  headers: {
    // 缺少必需的user-agent
    authorization: "Bearer token123",
    "content-type": "application/json",
  },
});

console.log("\n" + "=".repeat(50) + "\n");

// 测试3: 边界情况
console.log("📝 测试3: 边界情况");
validateRequest({
  body: null, // null数据
  query: {}, // 空对象
  headers: undefined, // undefined数据
});
