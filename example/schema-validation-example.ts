/**
 * Schema验证器使用示例
 * 
 * 展示如何使用validateSchemaConfig函数验证SchemaConfig结构的数据
 */

import { Type } from "@sinclair/typebox";
import { validateSchemaConfig, validateSchemaConfigAsync, createSchemaValidator } from "../src/utils/schema-validator";

// 定义各种Schema
const userSchema = Type.Object({
  id: Type.Number(),
  name: Type.String({ minLength: 1, maxLength: 100 }),
  email: Type.String({ pattern: "^[^@]+@[^@]+\\.[^@]+$" }),
  age: Type.Optional(Type.Number({ minimum: 0, maximum: 150 })),
});

const querySchema = Type.Object({
  page: Type.Optional(Type.Number({ minimum: 1 })),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100 })),
  search: Type.Optional(Type.String()),
});

const paramsSchema = Type.Object({
  userId: Type.String({ pattern: "^[0-9a-fA-F]{24}$" }),
});

const headersSchema = Type.Object({
  "authorization": Type.String({ pattern: "^Bearer .*" }),
  "content-type": Type.Optional(Type.String()),
});

const cookiesSchema = Type.Object({
  sessionId: Type.String(),
  theme: Type.Optional(Type.Union([Type.Literal("light"), Type.Literal("dark")])),
});

// 创建Schema配置
const schemaConfig = {
  body: userSchema,
  query: querySchema,
  params: paramsSchema,
  headers: headersSchema,
  cookies: cookiesSchema,
};

// 示例1: 同步验证
function exampleSyncValidation() {
  console.log("=== 同步验证示例 ===");
  
  const requestData = {
    body: {
      id: 1,
      name: "张三",
      email: "zhangsan@example.com",
      age: 25,
    },
    query: {
      page: 1,
      limit: 20,
      search: "用户",
    },
    params: {
      userId: "507f1f77bcf86cd799439011",
    },
    headers: {
      "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "content-type": "application/json",
    },
    cookies: {
      sessionId: "sess_123456789",
      theme: "dark",
    },
  };

  const result = validateSchemaConfig(schemaConfig, requestData);
  
  if (result.success) {
    console.log("✅ 验证成功:", result.data);
  } else {
    console.log("❌ 验证失败:");
    result.errors?.forEach(({ field, error }) => {
      console.log(`  ${field}:`, error.errors);
    });
  }
}

// 示例2: 异步验证
async function exampleAsyncValidation() {
  console.log("\n=== 异步验证示例 ===");
  
  const requestData = {
    body: {
      id: "invalid_id", // 应该是数字
      name: "", // 空字符串，违反minLength
      email: "invalid-email", // 无效邮箱格式
    },
    query: {
      page: 0, // 违反minimum: 1
      limit: 200, // 违反maximum: 100
    },
    params: {
      userId: "invalid-user-id", // 违反pattern
    },
    headers: {
      "authorization": "Invalid Token", // 违反pattern
    },
    cookies: {
      sessionId: "sess_123456789",
      theme: "blue", // 不在允许的枚举值中
    },
  };

  const result = await validateSchemaConfigAsync(schemaConfig, requestData);
  
  if (result.success) {
    console.log("✅ 验证成功:", result.data);
  } else {
    console.log("❌ 验证失败:");
    result.errors?.forEach(({ field, error }) => {
      console.log(`  ${field}:`);
      error.errors?.forEach(err => {
        console.log(`    - ${err.path}: ${err.message}`);
      });
    });
  }
}

// 示例3: 使用工厂函数创建验证器
function exampleFactoryFunction() {
  console.log("\n=== 工厂函数示例 ===");
  
  // 只验证body和query
  const partialConfig = {
    body: userSchema,
    query: querySchema,
  };
  
  const validator = createSchemaValidator(partialConfig);
  
  const requestData = {
    body: {
      id: 2,
      name: "李四",
      email: "lisi@example.com",
    },
    query: {
      page: 2,
      limit: 10,
    },
    // 这些字段不会被验证，但会被保留
    params: { userId: "507f1f77bcf86cd799439012" },
    headers: { "x-custom": "value" },
  };
  
  const result = validator(requestData);
  
  if (result.success) {
    console.log("✅ 部分验证成功:", result.data);
  } else {
    console.log("❌ 部分验证失败:", result.errors);
  }
}

// 示例4: 错误处理
function exampleErrorHandling() {
  console.log("\n=== 错误处理示例 ===");
  
  const invalidData = {
    body: {
      id: "not_a_number",
      name: "", // 空字符串
      email: "invalid-email",
      age: -5, // 负数
    },
  };
  
  const result = validateSchemaConfig({ body: userSchema }, invalidData);
  
  if (!result.success) {
    console.log("❌ 验证失败，详细错误信息:");
    result.errors?.forEach(({ field, error }) => {
      console.log(`\n${field} 字段错误:`);
      error.errors?.forEach(err => {
        console.log(`  - 路径: ${err.path || "root"}`);
        console.log(`  - 消息: ${err.message}`);
        console.log(`  - 值: ${JSON.stringify(err.value)}`);
        console.log(`  - 代码: ${err.code}`);
      });
    });
  }
}

// 运行所有示例
async function runExamples() {
  try {
    exampleSyncValidation();
    await exampleAsyncValidation();
    exampleFactoryFunction();
    exampleErrorHandling();
  } catch (error) {
    console.error("示例运行出错:", error);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  runExamples();
}

export {
  exampleSyncValidation,
  exampleAsyncValidation,
  exampleFactoryFunction,
  exampleErrorHandling,
  runExamples,
};
