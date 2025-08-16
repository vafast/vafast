/**
 * 请求验证器使用示例
 *
 * 展示如何使用request-validator进行类型安全的请求验证
 */

import { Type } from "@sinclair/typebox";
import { parseAndValidateRequest, createRequestValidator } from "../src/utils/request-validator";
import type { SchemaConfig } from "../src/utils/validators/validators-ultra";

// 定义Schema
const userSchema = Type.Object({
  id: Type.Number(),
  name: Type.String({ minLength: 1, maxLength: 100 }),
  email: Type.String({ pattern: "^[^@]+@[^@]+\\.[^@]+$" }),
  age: Type.Optional(Type.Number({ minimum: 0, maximum: 150 })),
});

const querySchema = Type.Object({
  page: Type.Number({ minimum: 1 }),
  limit: Type.Number({ minimum: 1, maximum: 100 }),
  search: Type.Optional(Type.String()),
});

const paramsSchema = Type.Object({
  userId: Type.String({ pattern: "^[0-9a-fA-F]{24}$" }),
});

const headersSchema = Type.Object({
  authorization: Type.String({ pattern: "^Bearer .*" }),
  "content-type": Type.Optional(Type.String()),
});

const cookiesSchema = Type.Object({
  sessionId: Type.String(),
  theme: Type.Optional(Type.Union([Type.Literal("light"), Type.Literal("dark")])),
});

// 创建Schema配置
const schemaConfig: SchemaConfig = {
  body: userSchema,
  query: querySchema,
  params: paramsSchema,
  headers: headersSchema,
  cookies: cookiesSchema,
};

// 示例1: 直接使用解析和验证函数
async function example1() {
  console.log("=== 示例1: 直接使用解析和验证函数 ===");

  // 模拟一个Request对象
  const mockRequest = new Request("http://localhost:3000/users/123?page=1&limit=20&search=john", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      cookie: "sessionId=sess_123; theme=dark",
    },
    body: JSON.stringify({
      id: 1,
      name: "张三",
      email: "zhangsan@example.com",
      age: 25,
    }),
  });

  const params = { userId: "507f1f77bcf86cd799439011" };

  // 使用验证器
  const result = await parseAndValidateRequest(mockRequest, schemaConfig, params);

  if (result.success) {
    console.log("✅ 验证成功!");
    console.log("Body:", result.data?.body);
    console.log("Query:", result.data?.query);
    console.log("Params:", result.data?.params);
    console.log("Headers:", result.data?.headers);
    console.log("Cookies:", result.data?.cookies);
  } else {
    console.log("❌ 验证失败:", result.errors);
  }
}

// 示例2: 使用工厂函数创建验证器
async function example2() {
  console.log("\n=== 示例2: 使用工厂函数创建验证器 ===");

  // 创建验证器
  const validator = createRequestValidator(schemaConfig);

  // 模拟Request对象
  const mockRequest = new Request("http://localhost:3000/users/456?page=2&limit=10", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer token_456",
      cookie: "sessionId=sess_456; theme=light",
    },
    body: JSON.stringify({
      id: 2,
      name: "李四",
      email: "lisi@example.com",
      age: 30,
    }),
  });

  const params = { userId: "507f1f77bcf86cd799439012" };

  // 使用验证器
  const result = await validator(mockRequest, params);
  console.log("验证结果:", result.success ? "成功" : "失败");
}

// 示例3: 类型安全的验证结果
async function example3() {
  console.log("\n=== 示例3: 类型安全的验证结果 ===");

  // 创建一个简化的Schema配置，只验证body
  const simpleConfig: SchemaConfig = {
    body: userSchema,
  };

  const mockRequest = new Request("http://localhost:3000/users", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      id: 3,
      name: "王五",
      email: "wangwu@example.com",
    }),
  });

  const result = await parseAndValidateRequest(mockRequest, simpleConfig);

  if (result.success && result.data) {
    // 这里TypeScript会提供完整的类型安全
    const validatedData = result.data;

    // 类型断言，因为我们知道body已经被验证过了
    const userBody = validatedData.body as any;

    console.log("验证后的用户数据:");
    console.log("ID:", userBody.id);
    console.log("姓名:", userBody.name);
    console.log("邮箱:", userBody.email);
    console.log("年龄:", userBody.age);

    // 可以安全地进行类型检查
    if (userBody.age && userBody.age > 18) {
      console.log("成年用户");
    }
  }
}

// 示例4: 错误处理
async function example4() {
  console.log("\n=== 示例4: 错误处理 ===");

  // 创建一个无效的请求
  const invalidRequest = new Request("http://localhost:3000/users", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      // 缺少必需的id字段
      name: "无效用户",
      email: "invalid-email", // 无效的邮箱格式
    }),
  });

  const result = await parseAndValidateRequest(invalidRequest, schemaConfig);
  if (!result.success) {
    console.log("❌ 验证失败，错误详情:");
    result.errors?.forEach((error, index) => {
      console.log(`错误 ${index + 1}:`);
      console.log(`  字段: ${error.field}`);
      console.log(`  消息: ${error.message}`);
    });
  }
}

// 运行所有示例
async function runExamples() {
  try {
    await example1();
    await example2();
    await example3();
    await example4();

    console.log("\n🎉 所有示例运行完成！");
  } catch (error) {
    console.error("运行示例时出错:", error);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  runExamples();
}

export { example1, example2, example3, example4, runExamples };
