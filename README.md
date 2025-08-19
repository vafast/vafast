# Vafast 🚀

> 超高性能的Node.js Web框架，专为Bun运行时设计

[![CI](https://github.com/vafast/vafast/workflows/CI/badge.svg)](https://github.com/vafast/vafast/actions)
[![npm version](https://badge.fury.io/js/vafast.svg)](https://badge.fury.io/js/vafast)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Bun](https://img.shields.io/badge/Bun-1.0+-FF6B6B?logo=bun)](https://bun.sh/)

一个专注于性能和易用性的现代Node.js Web框架，内置超优化的验证器和中间件系统。

## 🚀 核心特性

- **超高性能**: 基于优化的验证器和路由系统
- **类型安全**: 完整的TypeScript支持
- **中间件系统**: 灵活可扩展的中间件架构
- **内置验证**: 超优化的Schema验证器
- **零依赖**: 最小化外部依赖

## 📦 安装

```bash
# 使用 bun (推荐)
bun add vafast

# 使用 npm
npm install vafast

# 使用 yarn
yarn add vafast
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

- [📖 完整文档](./docs/)
- [🚀 快速开始](./docs/getting-started/quickstart.md)
- [🎯 核心功能](./docs/core/)
- [🔧 高级功能](./docs/advanced/)
- [📖 API参考](./docs/api/)
- [🧪 示例代码](./examples/)

## 🧪 测试

```bash
# 运行所有测试
bun test

# 运行性能测试
bun run benchmark

# 运行特定测试
bun test:unit          # 单元测试
bun test:integration   # 集成测试
bun test:coverage      # 覆盖率测试

# 运行基准测试
bun benchmark:quick           # 快速测试
bun benchmark:validators      # 验证器测试
bun benchmark:ultra           # 超性能测试
bun benchmark:ultimate        # 终极性能测试
bun benchmark:comprehensive   # 综合测试
```

## 📊 性能基准

基于100,000次迭代的性能测试结果：

| 验证器 | 总耗时 | 性能提升 | 稳定性 |
|--------|--------|----------|---------|
| **Ultra标准版** | 24.28ms | 基准 | 稳定 |
| **Ultra展开版** | 23.63ms | **+2.7%** | 稳定 |

## 🤝 贡献

我们欢迎所有形式的贡献！请查看我们的 [贡献指南](./docs/contributing/) 开始参与。

### 快速开始
1. [Fork](https://github.com/vafast/vafast/fork) 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: 添加新功能'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 [Pull Request](https://github.com/vafast/vafast/compare)

### 贡献类型
- 🐛 Bug 修复
- ✨ 新功能
- 📚 文档改进
- 🧪 测试用例
- 🚀 性能优化

### 社区
- [Issues](https://github.com/vafast/vafast/issues) - 报告 Bug 或请求功能
- [Discussions](https://github.com/vafast/vafast/discussions) - 讨论想法和问题
- [Releases](https://github.com/vafast/vafast/releases) - 查看最新版本

## 📄 许可证

MIT License

## 🏆 为什么选择Vafast？

1. **🚀 极致性能**: 超优化的验证器和路由系统
2. **🔒 开发体验**: 完整的TypeScript支持和智能提示
3. **✅ 生产就绪**: 经过严格测试的稳定版本
4. **⚡ 零配置**: 开箱即用的最佳实践配置
5. **🔄 活跃维护**: 持续的性能优化和功能更新

## 📊 性能基准

基于100,000次迭代的性能测试结果：

| 验证器 | 总耗时 | 性能提升 | 稳定性 |
|--------|--------|----------|---------|
| **Ultra标准版** | 24.28ms | 基准 | 稳定 |
| **Ultra展开版** | 23.63ms | **+2.7%** | 稳定 |

## 🌟 特性亮点

- **⚡ 超高性能**: 基于优化的验证器和路由系统
- **🔒 类型安全**: 完整的TypeScript支持
- **🧩 中间件系统**: 灵活可扩展的中间件架构
- **✅ 内置验证**: 超优化的Schema验证器
- **🎯 零依赖**: 最小化外部依赖
- **🚀 Bun原生**: 专为Bun运行时优化

---

**Vafast** - 让Web开发更快、更安全、更高效！ 🚀

## 📄 许可证

本项目采用 [MIT 许可证](./LICENSE)。


