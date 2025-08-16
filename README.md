# Vafast - 超高性能的Node.js Web框架

一个专注于性能和易用性的现代Node.js Web框架，内置超优化的验证器和中间件系统。

## 🚀 核心特性

- **超高性能**: 基于优化的验证器和路由系统
- **类型安全**: 完整的TypeScript支持
- **中间件系统**: 灵活可扩展的中间件架构
- **内置验证**: 超优化的Schema验证器
- **零依赖**: 最小化外部依赖

## 📦 安装

```bash
npm install vafast
# 或
yarn add vafast
# 或
bun add vafast
```

## 🎯 快速开始

### 基础示例

```typescript
import { createServer, defineRoute } from 'vafast';
import { Type } from '@sinclair/typebox';

// 定义路由Schema
const userSchema = Type.Object({
  name: Type.String({ minLength: 1 }),
  email: Type.String({ pattern: '^[^@]+@[^@]+\\.[^@]+$' }),
  age: Type.Optional(Type.Number({ minimum: 0 }))
});

// 创建路由
const userRoute = defineRoute({
  method: 'POST',
  path: '/users',
  body: userSchema,
  handler: async (req) => {
    const { name, email, age } = req.body;
    return { success: true, user: { name, email, age } };
  }
});

// 创建服务器
const server = createServer();
server.addRoute(userRoute);

server.listen(3000, () => {
  console.log('🚀 服务器运行在 http://localhost:3000');
});
```

### 使用超优化验证器

```typescript
import { validateAllSchemasExpanded } from 'vafast/utils/validators/validators-ultra';

// 定义Schema配置
const schemaConfig = {
  body: userSchema,
  query: querySchema,
  params: paramsSchema,
  headers: headersSchema,
  cookies: cookiesSchema
};

// 验证请求数据
const validatedData = validateAllSchemasExpanded(schemaConfig, {
  body: req.body,
  query: req.query,
  params: req.params,
  headers: req.headers,
  cookies: req.cookies
});
```

## 🔧 超优化验证器

### Ultra验证器

我们的旗舰验证器，提供极致性能：

- **性能提升**: 相比基础版本提升 **25.7%**
- **内存优化**: 智能缓存和内存池管理
- **类型特化**: 针对特定数据类型的优化验证器
- **批量验证**: 支持数组数据的批量验证

```typescript
import { 
  validateAllSchemasExpanded,
  createTypedValidator,
  validateBatch 
} from 'vafast/utils/validators/validators-ultra';

// 创建类型特化验证器
const userValidator = createTypedValidator(userSchema);
const validatedUser = userValidator(userData);

// 批量验证
const validatedUsers = validateBatch(userSchema, userArray);
```

## 📚 文档

- [基础使用指南](./docs/basic-usage.md)
- [中间件开发](./docs/middleware.md)
- [性能优化指南](./docs/performance.md)
- [API参考](./docs/api-reference.md)

## 🧪 测试

```bash
# 运行所有测试
npm test

# 运行性能测试
npm run benchmark

# 运行Ultra验证器性能测试
bun run benchmarks/ultra-performance-test.ts
```

## 📊 性能基准

基于100,000次迭代的性能测试结果：

| 验证器 | 总耗时 | 性能提升 | 稳定性 |
|--------|--------|----------|---------|
| **Ultra标准版** | 24.28ms | 基准 | 稳定 |
| **Ultra展开版** | 23.63ms | **+2.7%** | 稳定 |

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📄 许可证

MIT License

## 🏆 为什么选择Vafast？

1. **极致性能**: 超优化的验证器和路由系统
2. **开发体验**: 完整的TypeScript支持和智能提示
3. **生产就绪**: 经过严格测试的稳定版本
4. **零配置**: 开箱即用的最佳实践配置
5. **活跃维护**: 持续的性能优化和功能更新

---

**Vafast** - 让Web开发更快、更安全、更高效！ 🚀


