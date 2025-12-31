# Vafast 🚀

[![npm version](https://badge.fury.io/js/vafast.svg)](https://badge.fury.io/js/vafast)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript)](https://www.typescriptlang.org/)

**超高性能的 TypeScript Web 框架，类型安全、轻量、快速。**

```typescript
import { Server, createHandler } from 'vafast';

const server = new Server([
  { method: 'GET', path: '/', handler: createHandler(() => 'Hello Vafast!') }
]);

export default { port: 3000, fetch: server.fetch };
```

```bash
# 启动服务器
bun run index.ts   # 或
npx tsx index.ts
```

## ⚡ 性能

| 框架 | RPS | 相对性能 |
|------|-----|----------|
| Elysia | ~118K | 100% |
| **Vafast** | **~101K** | **86%** |
| Express | ~56K | 48% |
| Hono | ~56K | 47% |

> **Vafast 比 Express/Hono 快约 1.8x！**  
> 测试环境：Bun 1.2.20, macOS, wrk 基准测试 (4线程, 100连接, 30s)

## 📦 安装

```bash
# npm
npm install vafast

# bun
bun add vafast
```

## 🎯 核心功能

- ⚡ **JIT 编译验证器** - Schema 验证器编译缓存，避免重复编译
- 🔗 **中间件链预编译** - 路由注册时预编译处理链，运行时零开销
- 🎯 **快速请求解析** - 优化的 Query/Cookie 解析，比标准方法快 2x
- 🔒 **端到端类型安全** - 完整的 TypeScript 类型推断
- 🧩 **灵活中间件系统** - 可组合的中间件架构
- 📦 **零配置** - 开箱即用，无需复杂配置

### 类型安全的路由

```typescript
import { Server, defineRoutes, createHandler, Type } from 'vafast';

const routes = defineRoutes([
  {
    method: 'POST',
    path: '/users',
    handler: createHandler(
      { body: Type.Object({ name: Type.String(), email: Type.String() }) },
      ({ body }) => {
        // body.name 和 body.email 自动类型推断
        return { success: true, user: body };
      }
    )
  }
]);

const server = new Server(routes);
export default { port: 3000, fetch: server.fetch };
```

### 路径参数

```typescript
{
  method: 'GET',
  path: '/users/:id',
  handler: createHandler(
    { params: Type.Object({ id: Type.String() }) },
    ({ params }) => ({ userId: params.id })
  )
}
```

### 中间件

```typescript
const authMiddleware = async (req, next) => {
  const token = req.headers.get('Authorization');
  if (!token) return new Response('Unauthorized', { status: 401 });
  return next(req);
};

const routes = defineRoutes([
  {
    method: 'GET',
    path: '/protected',
    middleware: [authMiddleware],
    handler: createHandler(() => ({ secret: 'data' }))
  }
]);
```

### 嵌套路由

```typescript
const routes = defineRoutes([
  {
    path: '/api',
    middleware: [apiMiddleware],
    children: [
      { method: 'GET', path: '/users', handler: getUsers },
      { method: 'POST', path: '/users', handler: createUser },
      {
        path: '/users/:id',
        children: [
          { method: 'GET', path: '/', handler: getUser },
          { method: 'PUT', path: '/', handler: updateUser },
          { method: 'DELETE', path: '/', handler: deleteUser },
        ]
      }
    ]
  }
]);
```

### JIT 编译验证器

Vafast 内置验证器 JIT 编译，自动缓存编译后的验证器：

```typescript
import { createValidator, validateFast, precompileSchemas } from 'vafast';
import { Type } from '@sinclair/typebox';

const UserSchema = Type.Object({
  name: Type.String(),
  age: Type.Number()
});

// 方式一：自动缓存（推荐）
// 首次调用编译，后续调用使用缓存
const result = validateFast(UserSchema, data);

// 方式二：预编译验证器（最高性能）
const validateUser = createValidator(UserSchema);
const isValid = validateUser(data);

// 启动时预编译（避免首次请求开销）
precompileSchemas([UserSchema, PostSchema, CommentSchema]);
```

**性能效果：首次编译后，10000 次验证仅需 ~5ms**

### 中间件预编译

Vafast 自动在路由注册时预编译中间件链，消除运行时组合开销：

```typescript
const server = new Server(routes);

// 添加全局中间件后，手动触发预编译
server.use(authMiddleware);
server.use(logMiddleware);
server.compile(); // 预编译所有路由的处理链

// 预编译后，每次请求直接执行编译好的处理链，无需运行时组合
```

**性能效果：1000 次请求仅需 ~4ms，平均每次 0.004ms**

## 🔧 运行时支持

### Bun

```typescript
export default { port: 3000, fetch: server.fetch };
```

### Node.js

```typescript
import { serve } from '@vafast/node-server';
serve({ fetch: server.fetch, port: 3000 });
```

> 💡 两种运行时使用相同的 API，代码可无缝迁移

## 📚 文档

- [快速开始](./docs/getting-started/quickstart.md)
- [API 参考](./docs/api/)
- [示例代码](./examples/)

## 🤝 贡献

欢迎贡献！请查看 [贡献指南](./CONTRIBUTING.md)。

```bash
git clone https://github.com/vafast/vafast.git
cd vafast
npm install  # 或 bun install
npm test     # 或 bun test
```

## 📄 许可证

[MIT](./LICENSE)

---

**Vafast** - 让 Web 开发更快、更安全、更高效！
