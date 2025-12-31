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
| Elysia | 114.6K | 100% |
| **Vafast** | **103.3K** | **90%** |
| Express | 55.3K | 48% |
| Hono | 53.1K | 46% |

> 测试环境：wrk 基准测试 (4线程, 100连接, 30s)

## 📦 安装

```bash
# npm
npm install vafast

# bun
bun add vafast
```

## 🎯 核心功能

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
