/**
 * Schema 验证器使用示例
 *
 * 展示 validateSchema / validateAllSchemas / createValidator 的用法
 */

import {
  Type,
  validateSchema,
  validateAllSchemas,
  createValidator,
  isValidationFailedError,
  type SchemaConfig,
  type ValidationError,
} from "../../src/index";

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
  authorization: Type.String({ pattern: "^Bearer .*" }),
  "content-type": Type.Optional(Type.String()),
});

const cookiesSchema = Type.Object({
  sessionId: Type.String(),
  theme: Type.Optional(Type.Union([Type.Literal("light"), Type.Literal("dark")])),
});

const schemaConfig: SchemaConfig = {
  body: userSchema,
  query: querySchema,
  params: paramsSchema,
  headers: headersSchema,
  cookies: cookiesSchema,
};

function printValidationErrors(errors: ValidationError[]) {
  for (const error of errors) {
    console.log(`  ${error.field || "root"}: ${error.message}`);
  }
}

/** 示例1: 单字段同步验证（返回结果，不抛错） */
function exampleSyncValidation() {
  console.log("=== 同步验证示例 ===");

  const result = validateSchema(userSchema, {
    id: 1,
    name: "张三",
    email: "zhangsan@example.com",
    age: 25,
  });

  if (result.success) {
    console.log("✅ 验证成功:", result.data);
  } else {
    console.log("❌ 验证失败:");
    printValidationErrors(result.errors);
  }
}

/** 示例2: 批量验证请求各位置（失败抛 ValidationFailedError） */
function exampleBatchValidation() {
  console.log("\n=== 批量验证示例 ===");

  try {
    validateAllSchemas(schemaConfig, {
      body: {
        id: "invalid_id",
        name: "",
        email: "invalid-email",
      },
      query: {
        page: 0,
        limit: 200,
      },
      params: {
        userId: "invalid-user-id",
      },
      headers: {
        authorization: "Invalid Token",
      },
      cookies: {
        sessionId: "sess_123456789",
        theme: "blue",
      },
    });
    console.log("✅ 批量验证成功");
  } catch (err) {
    if (isValidationFailedError(err)) {
      console.log("❌ 批量验证失败:");
      for (const detail of err.details) {
        console.log(`  [${detail.location}] ${detail.field}: ${detail.message}`);
      }
    } else {
      throw err;
    }
  }
}

/** 示例3: 工厂函数创建单 schema 验证器 */
function exampleFactoryFunction() {
  console.log("\n=== 工厂函数示例 ===");

  const validateUser = createValidator(userSchema);

  const ok = validateUser({
    id: 2,
    name: "李四",
    email: "lisi@example.com",
  });
  const bad = validateUser({
    id: "not_a_number",
    name: "",
    email: "invalid-email",
    age: -5,
  });

  if (ok.success) {
    console.log("✅ 部分验证成功:", ok.data);
  }

  if (!bad.success) {
    console.log("❌ 部分验证失败:");
    printValidationErrors(bad.errors);
  }
}

async function runExamples() {
  try {
    exampleSyncValidation();
    exampleBatchValidation();
    exampleFactoryFunction();
  } catch (error) {
    console.error("示例运行出错:", error);
  }
}

const isDirectRun =
  typeof process !== "undefined" &&
  Boolean(process.argv[1]) &&
  import.meta.url.includes("schema-validation-example");

if (isDirectRun) {
  void runExamples();
}

export {
  exampleSyncValidation,
  exampleBatchValidation,
  exampleFactoryFunction,
  runExamples,
};
