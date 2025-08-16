# Schema配置验证器

这个模块提供了一个强大的Schema配置验证器，使用 `validateSchema` 函数对 `SchemaConfig` 结构的数据进行验证。

## 功能特性

- ✅ 支持完整的HTTP请求数据验证（body, query, params, headers, cookies）
- ✅ 同步和异步验证支持
- ✅ 详细的错误信息和类型安全
- ✅ 工厂函数模式，支持创建可重用的验证器
- ✅ 灵活的配置，支持部分字段验证
- ✅ 完整的TypeScript类型支持

## 核心接口

### SchemaConfig
```typescript
interface SchemaConfig {
  body?: TSchema;      // 请求体验证Schema
  query?: TSchema;     // 查询参数验证Schema
  params?: TSchema;    // 路径参数验证Schema
  headers?: TSchema;   // 请求头验证Schema
  cookies?: TSchema;   // Cookie验证Schema
}
```

### RequestData
```typescript
interface RequestData {
  body?: unknown;      // 请求体数据
  query?: unknown;     // 查询参数数据
  params?: unknown;    // 路径参数数据
  headers?: unknown;   // 请求头数据
  cookies?: unknown;   // Cookie数据
}
```

### SchemaValidationResult
```typescript
interface SchemaValidationResult {
  success: boolean;    // 验证是否成功
  data?: RequestData;  // 验证成功后的数据
  errors?: Array<{     // 验证失败时的错误信息
    field: keyof SchemaConfig;
    error: ValidationResult<unknown>;
  }>;
}
```

## 主要函数

### 1. validateSchemaConfig
同步验证函数，用于验证完整的请求数据。

```typescript
function validateSchemaConfig(
  config: SchemaConfig,
  data: RequestData
): SchemaValidationResult
```

**使用示例：**
```typescript
import { Type } from "@sinclair/typebox";
import { validateSchemaConfig } from "./schema-validator";

const userSchema = Type.Object({
  id: Type.Number(),
  name: Type.String({ minLength: 1 }),
  email: Type.String({ format: "email" }),
});

const config = { body: userSchema };
const data = {
  body: {
    id: 1,
    name: "张三",
    email: "zhangsan@example.com",
  },
};

const result = validateSchemaConfig(config, data);
if (result.success) {
  console.log("验证成功:", result.data);
} else {
  console.log("验证失败:", result.errors);
}
```

### 2. validateSchemaConfigAsync
异步验证函数，支持并行验证以提高性能。

```typescript
async function validateSchemaConfigAsync(
  config: SchemaConfig,
  data: RequestData
): Promise<SchemaValidationResult>
```

**使用示例：**
```typescript
const result = await validateSchemaConfigAsync(config, data);
if (result.success) {
  console.log("异步验证成功:", result.data);
} else {
  console.log("异步验证失败:", result.errors);
}
```

### 3. createSchemaValidator
工厂函数，创建可重用的验证器实例。

```typescript
function createSchemaValidator(config: SchemaConfig): (data: RequestData) => SchemaValidationResult
```

**使用示例：**
```typescript
const validator = createSchemaValidator(config);

// 可以重复使用同一个验证器
const result1 = validator(data1);
const result2 = validator(data2);
```

### 4. createAsyncSchemaValidator
异步工厂函数，创建异步验证器实例。

```typescript
function createAsyncSchemaValidator(config: SchemaConfig): (data: RequestData) => Promise<SchemaValidationResult>
```

## 高级用法

### 部分验证
你可以只配置需要验证的字段，其他字段会被保留但不验证：

```typescript
const partialConfig = {
  body: userSchema,
  // 没有配置query, params等，这些字段不会被验证但会被保留
};

const result = validateSchemaConfig(partialConfig, requestData);
```

### 复杂Schema验证
支持嵌套的复杂Schema结构：

```typescript
const complexSchema = Type.Object({
  user: Type.Object({
    profile: Type.Object({
      personal: Type.Object({
        firstName: Type.String(),
        lastName: Type.String(),
      }),
      preferences: Type.Array(Type.String()),
    }),
  }),
  metadata: Type.Object({
    tags: Type.Array(Type.String()),
    createdAt: Type.String({ format: "date-time" }),
  }),
});

const config = { body: complexSchema };
```

### 错误处理
验证失败时会提供详细的错误信息：

```typescript
if (!result.success) {
  result.errors?.forEach(({ field, error }) => {
    console.log(`${field} 字段验证失败:`);
    error.errors?.forEach(err => {
      console.log(`  - 路径: ${err.path}`);
      console.log(`  - 消息: ${err.message}`);
      console.log(`  - 值: ${JSON.stringify(err.value)}`);
      console.log(`  - 代码: ${err.code}`);
    });
  });
}
```

## 性能优化

- **缓存优化**: 验证器会缓存编译后的Schema以提高性能
- **并行验证**: 异步验证器支持并行验证多个字段
- **懒加载**: 只验证配置中指定的字段
- **类型安全**: 完整的TypeScript类型支持，编译时错误检查

## 最佳实践

1. **Schema设计**: 使用TypeBox的丰富验证规则设计Schema
2. **错误处理**: 总是检查验证结果并适当处理错误
3. **性能考虑**: 对于高频验证，使用工厂函数创建验证器实例
4. **类型安全**: 利用TypeScript的类型系统确保类型安全
5. **测试覆盖**: 为验证逻辑编写完整的测试用例

## 与现有代码的集成

这个验证器完全兼容现有的 `validateSchema` 函数，可以无缝集成到现有的验证流程中。它扩展了原有的验证能力，提供了更高级的配置管理和错误处理功能。
