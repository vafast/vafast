# 数据验证器

基于 [TypeBox](https://github.com/sinclairzx81/typebox) 构建的类型安全数据验证器，专为 HTTP 请求验证设计。

## 特性

- 🚀 **类型安全**: 完整的 TypeScript 类型推断
- ⚡ **高性能**: 基于 TypeBox 的编译时优化
- 🎯 **简单易用**: 单一函数，专注核心功能
- 🔒 **类型安全**: 验证成功后返回类型安全的数据
- 📍 **详细错误**: 使用 TypeCompiler.Errors 提供精确的错误路径和消息

## 安装

```bash
npm install @sinclair/typebox
```

## 基本用法

### 1. 定义 Schema

```typescript
import { Type } from "@sinclair/typebox";

// 用户 Schema
const UserSchema = Type.Object({
  id: Type.Number(),
  name: Type.String(),
  email: Type.String(),
  age: Type.Optional(Type.Number({ minimum: 0, maximum: 150 })),
  tags: Type.Array(Type.String())
});

// 查询参数 Schema
const QuerySchema = Type.Object({
  page: Type.Optional(Type.Number({ minimum: 1 })),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100 })),
  search: Type.Optional(Type.String())
});
```

### 2. 验证数据

```typescript
import { validateSchema } from "./utils/validators";

// 验证请求体
const bodyResult = validateSchema(UserSchema, requestBody);
if (bodyResult.success) {
  // 类型安全的数据
  const user = bodyResult.data; // 类型: { id: number; name: string; email: string; age?: number; tags: string[] }
  console.log("用户ID:", user.id);
} else {
  // 详细的错误信息
  bodyResult.errors.forEach(error => {
    console.log(`路径: ${error.path}, 消息: ${error.message}, 值: ${error.value}`);
  });
}

// 验证查询参数
const queryResult = validateSchema(QuerySchema, queryParams);
if (queryResult.success) {
  const query = queryResult.data;
  console.log("页码:", query.page);
}
```

## 详细错误信息

验证器使用 TypeBox 的 `TypeCompiler.Errors` 功能，提供精确的错误诊断：

```typescript
const result = validateSchema(UserSchema, {
  id: "invalid-id", // 应该是数字
  name: "张三",
  // 缺少email字段
  age: 200, // 超出范围
  tags: "not-an-array" // 应该是数组
});

if (!result.success) {
  result.errors.forEach((error, index) => {
    console.log(`错误 ${index + 1}:`);
    console.log(`  路径: ${error.path || 'root'}`);
    console.log(`  消息: ${error.message}`);
    console.log(`  值: ${JSON.stringify(error.value)}`);
    if (error.schema) {
      console.log(`  Schema: ${JSON.stringify(error.schema)}`);
    }
  });
}
```

**输出示例:**
```
错误 1:
  路径: /email
  消息: Expected required property
  值: undefined
  Schema: {"type":"string"}
错误 2:
  路径: /id
  消息: Expected number
  值: "invalid-id"
  Schema: {"type":"number"}
错误 3:
  路径: /age
  消息: Expected number to be less or equal to 150
  值: 200
  Schema: {"minimum":0,"maximum":150,"type":"number"}
错误 4:
  路径: /tags
  消息: Expected array
  值: "not-an-array"
  Schema: {"type":"array","items":{"type":"string"}}
```

## 在 HTTP 框架中使用

### 与 Vafast 集成

```typescript
import { defineRoute } from "../defineRoute";
import { Type } from "@sinclair/typebox";
import { validateSchema } from "../utils/validators";

// 定义 Schema
const CreateUserSchema = Type.Object({
  name: Type.String(),
  email: Type.String(),
  age: Type.Optional(Type.Number())
});

// 定义路由
export const createUser = defineRoute({
  method: "POST",
  path: "/users",
  handler: async (req) => {
    // 验证请求体
    const bodyResult = validateSchema(CreateUserSchema, await req.json());
    
    if (!bodyResult.success) {
      return new Response(JSON.stringify({
        error: "validation_failed",
        message: "请求数据验证失败",
        details: bodyResult.errors.map(error => ({
          path: error.path,
          message: error.message,
          value: error.value
        }))
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 类型安全的数据
    const userData = bodyResult.data;
    
    // 处理业务逻辑...
    console.log("创建用户:", userData.name);
    
    return new Response(JSON.stringify({ success: true }), {
      status: 201,
      headers: { "Content-Type": "application/json" }
    });
  }
});
```

### 与 Express.js 集成

```typescript
import express from "express";
import { Type } from "@sinclair/typebox";
import { validateSchema } from "./utils/validators";

const app = express();

const UserSchema = Type.Object({
  name: Type.String(),
  email: Type.String()
});

app.post("/users", (req, res) => {
  const result = validateSchema(UserSchema, req.body);
  
  if (!result.success) {
    return res.status(400).json({
      error: "validation_failed",
      details: result.errors.map(error => ({
        field: error.path,
        message: error.message,
        received: error.value
      }))
    });
  }
  
  // 类型安全的数据
  const userData = result.data;
  // 处理业务逻辑...
  
  res.status(201).json({ success: true });
});
```

## 支持的 Schema 类型

TypeBox 支持所有 JSON Schema 类型：

- **基础类型**: `Type.String()`, `Type.Number()`, `Type.Boolean()`, `Type.Null()`
- **复合类型**: `Type.Object()`, `Type.Array()`, `Type.Tuple()`
- **联合类型**: `Type.Union()`, `Type.Intersect()`
- **字面量**: `Type.Literal()`
- **可选字段**: `Type.Optional()`
- **约束**: `Type.String({ minLength: 1 })`, `Type.Number({ minimum: 0 })`

## 错误处理

验证失败时，`ValidationResult` 包含详细的错误信息：

```typescript
interface ValidationError {
  path: string;        // 错误路径（如 "/email", "/age"）
  message: string;     // 错误消息（如 "Expected string", "Expected number to be less or equal to 150"）
  code: string;        // 错误代码
  value?: unknown;     // 导致错误的值
  schema?: unknown;    // 相关的Schema定义
}
```

## 性能优化

- 使用 TypeBox 的 `TypeCompiler.Compile()` 预编译 Schema
- 验证失败时使用 `compiler.Errors()` 生成详细错误信息
- 适合高频验证场景
- 每个 Schema 在应用启动时仅编译一次

## 类型安全

验证成功后，TypeScript 能够完全推断出数据的类型：

```typescript
const UserSchema = Type.Object({
  id: Type.Number(),
  name: Type.String()
});

const result = validateSchema(UserSchema, data);
if (result.success) {
  // result.data 的类型被推断为 { id: number; name: string }
  const user = result.data;
  user.id.toFixed(2); // ✅ 类型安全
  user.name.toUpperCase(); // ✅ 类型安全
}
```

## 最佳实践

1. **Schema 复用**: 定义可复用的 Schema 组件
2. **错误处理**: 利用详细的错误信息提供友好的用户反馈
3. **类型导出**: 导出 Schema 类型供其他地方使用
4. **性能考虑**: 对于高频验证，考虑缓存编译后的 Schema
5. **错误展示**: 将错误路径转换为用户友好的字段名称

```typescript
// 定义可复用的 Schema 组件
export const BaseUserSchema = Type.Object({
  id: Type.Number(),
  name: Type.String(),
  email: Type.String()
});

export const CreateUserSchema = Type.Omit(BaseUserSchema, ["id"]);
export const UpdateUserSchema = Type.Partial(CreateUserSchema);

// 导出类型
export type User = Static<typeof BaseUserSchema>;
export type CreateUser = Static<typeof CreateUserSchema>;
export type UpdateUser = Static<typeof UpdateUserSchema>;

// 错误处理工具函数
function formatValidationErrors(errors: ValidationError[]) {
  return errors.map(error => ({
    field: error.path === 'root' ? 'data' : error.path.slice(1), // 去掉开头的 "/"
    message: error.message,
    received: error.value
  }));
}
```
