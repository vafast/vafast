# Vafast 🚀

[![npm version](https://badge.fury.io/js/vafast.svg)](https://badge.fury.io/js/vafast)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript)](https://www.typescriptlang.org/)

**超高性能的 TypeScript Web 框架，类型安全、轻量、快速。**

> Vafast 不只是框架，更是一种 **结构、清晰、可控** 的开发哲学。

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

## 💡 设计哲学

### 结构即真相 — 无装饰器，无链式魔法

**Elysia 完整示例：**
```typescript
import { Elysia } from 'elysia';

const app = new Elysia()
  .get('/users', () => 'list users')
  .post('/users', ({ body }) => body)
  .get('/users/:id', ({ params }) => `User ${params.id}`)
  .use(somePlugin);  // 插件作用域？要看文档

export default app;
```

**Hono 完整示例：**
```typescript
import { Hono } from 'hono';

const app = new Hono();
app.get('/users', (c) => c.text('list users'));
app.post('/users', async (c) => c.json(await c.req.json()));
app.get('/users/:id', (c) => c.text(`User ${c.req.param('id')}`));

export default app;
```

**Vafast 完整示例：**
```typescript
import { Server, createHandler } from 'vafast';
import type { Route } from 'vafast';

const routes: Route[] = [
  { method: 'GET',  path: '/users',     handler: createHandler(() => 'list users') },
  { method: 'POST', path: '/users',     handler: createHandler(({ body }) => body) },
  { method: 'GET',  path: '/users/:id', handler: createHandler(({ params }) => `User ${params.id}`) },
];

const server = new Server(routes);
export default { fetch: server.fetch };
```

**对比：Vafast 的路由是一个数组，一眼看清所有 API 端点。**

### 错误即数据 — 不是混乱，是契约

**Hono 完整示例：**
```typescript
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

const app = new Hono();

app.get('/user', (c) => {
  const name = c.req.query('name');
  if (!name) {
    throw new HTTPException(400, { message: 'Missing name' });
    // 响应格式自己定，没有标准
  }
  return c.text(`Hello, ${name}`);
});

export default app;
```

**Vafast 完整示例：**
```typescript
import { Server, VafastError, createHandler } from 'vafast';
import type { Route } from 'vafast';

const routes: Route[] = [
  {
    method: 'GET',
    path: '/user',
    handler: createHandler((ctx) => {
      const name = ctx.query.name;
      if (!name) {
        throw new VafastError('Missing name', {
          status: 400,
          type: 'bad_request',
          expose: true,  // 控制是否暴露给客户端
        });
      }
      return `Hello, ${name}`;
    }),
  },
];

const server = new Server(routes);
export default { fetch: server.fetch };
// 错误响应: { type: 'bad_request', message: 'Missing name' }
```

**对比：VafastError 有统一的 `type` + `status` + `expose` 契约。**

### 组合优于约定 — 显式优于隐式

**Hono 完整示例：**
```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();

// 中间件作用域通过路径匹配，容易出错
app.use('/*', cors());           // 全局
app.use('/api/*', authMiddleware);  // /api/* 但 /api 本身呢？

app.get('/public', (c) => c.text('public'));
app.get('/api/users', (c) => c.text('users'));

export default app;
```

**Vafast 完整示例：**
```typescript
import { Server, createHandler } from 'vafast';
import type { Route, Middleware } from 'vafast';

const authMiddleware: Middleware = async (req, next) => {
  const token = req.headers.get('Authorization');
  if (!token) return new Response('Unauthorized', { status: 401 });
  return next();
};

const routes: Route[] = [
  // 无中间件
  { method: 'GET', path: '/public', handler: createHandler(() => 'public') },
  // 仅 auth
  { method: 'GET', path: '/api/users', middleware: [authMiddleware], handler: createHandler(() => 'users') },
];

const server = new Server(routes);
export default { fetch: server.fetch };
```

**对比：Vafast 的中间件直接声明在路由上，一目了然。**

### 类型注入 — 跨文件不丢失

**Hono 跨文件类型问题：**
```typescript
// -------- file: app.ts --------
import { Hono } from 'hono';

type Env = { Variables: { user: { id: string; role: string } } };
const app = new Hono<Env>();

// -------- file: routes.ts --------
import { Hono } from 'hono';

// 类型参数丢失！
export function setupRoutes(app: Hono) {
  app.get('/profile', (c) => {
    const user = c.get('user');  // ❌ 类型是 unknown
    return c.json(user);
  });
}
```

**Vafast 跨文件类型完整：**
```typescript
// -------- file: types.ts --------
export type AuthContext = { user: { id: string; role: string } };

// -------- file: middleware/auth.ts --------
import type { Middleware } from 'vafast';

export const authMiddleware: Middleware = async (req, next) => {
  const user = await verifyToken(req.headers.get('Authorization'));
  (req as any).__locals = { user };
  return next();
};

// -------- file: handlers/profile.ts --------
import { createHandlerWithExtra } from 'vafast';
import type { AuthContext } from '../types';

// 类型在 Handler 级别定义，任意文件都能用！
export const getProfile = createHandlerWithExtra<AuthContext>((ctx) => {
  const user = ctx.user;  // ✅ 类型完整: { id: string; role: string }
  return { profile: user, isAdmin: user.role === 'admin' };
});

// -------- file: routes.ts --------
import { Server } from 'vafast';
import type { Route } from 'vafast';
import { authMiddleware } from './middleware/auth';
import { getProfile } from './handlers/profile';

const routes: Route[] = [
  { method: 'GET', path: '/profile', middleware: [authMiddleware], handler: getProfile },
];

const server = new Server(routes);
export default { fetch: server.fetch };
```

**对比：Vafast 的类型跟着 Handler 走，而不是跟着 App 实例走。**

### 边缘原生 — 一行代码，任意运行时

**Bun 环境完整示例：**
```typescript
import { Server, createHandler } from 'vafast';

const server = new Server([
  { method: 'GET', path: '/', handler: createHandler(() => 'Hello Bun!') }
]);

export default { port: 3000, fetch: server.fetch };
```

**Cloudflare Workers 完整示例：**
```typescript
import { Server, createHandler } from 'vafast';

const server = new Server([
  { method: 'GET', path: '/', handler: createHandler(() => 'Hello Workers!') }
]);

export default { fetch: server.fetch };
```

**Node.js 完整示例：**
```typescript
import { Server, createHandler } from 'vafast';
import { serve } from '@vafast/node-server';

const server = new Server([
  { method: 'GET', path: '/', handler: createHandler(() => 'Hello Node!') }
]);

serve({ fetch: server.fetch, port: 3000 }, () => {
  console.log('Server running on http://localhost:3000');
});
```

**对比：同一套代码，只需改导出方式即可切换运行时。**

### 零样板 — 一个文件，即刻运行

```bash
# ❌ NestJS - 需要脚手架和大量文件
nest new my-app  # 生成 20+ 文件

# ❌ Express - 需要配置和样板代码
npm init && npm install express && mkdir routes controllers...

# ✅ Vafast - 一个文件搞定
echo "import { Server } from 'vafast';
const server = new Server([{ method: 'GET', path: '/', handler: () => 'Hi' }]);
export default { fetch: server.fetch };" > index.ts && bun index.ts
```

### 与 Elysia/Hono 详细对比

| 特性 | Elysia | Hono | **Vafast** |
|------|--------|------|------------|
| **路由风格** | 链式 builder | 链式 builder | **声明式数组** |
| **路由一览性** | 分散在链中 | 分散在链中 | **一个数组看全部** |
| **中间件绑定** | .use() 隐式 | .use() 路径匹配 | **显式声明在路由上** |
| **错误类型** | error() 函数 | HTTPException | **VafastError 契约** |
| **类型推断** | 优秀 | 良好 | **优秀 (TypeBox)** |
| **跨文件类型** | ⚠️ 链断裂丢失 | ❌ 实例绑定丢失 | **✅ Handler 级独立** |
| **类型定义位置** | 链式调用上下文 | App 实例泛型 | **Handler 泛型参数** |
| **性能 (RPS)** | ~118K | ~56K | **~101K** |
| **学习曲线** | 中等 | 简单 | **简单** |
| **API 风格** | 函数式链 | Express-like | **配置式** |

### 为什么选择 Vafast？

| 如果你... | 选择 |
|----------|------|
| 追求极致性能 | Elysia (~118K) > **Vafast (~101K)** > Hono (~56K) |
| 喜欢链式 API | Elysia 或 Hono |
| **需要路由一览表** | **✅ Vafast** |
| **需要精确中间件控制** | **✅ Vafast** |
| **需要结构化错误** | **✅ Vafast** |
| **大型项目多文件拆分** | **✅ Vafast (类型不丢失)** |
| **团队协作类型安全** | **✅ Vafast** |
| 从 Express 迁移 | Hono (API 相似) |

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

### 内置 Format 验证器

Vafast 内置 30+ 常用 format 验证器，**导入框架时自动注册**，对标 Zod 的内置验证：

```typescript
import { Type, createHandler } from 'vafast';

// 直接使用内置 format，无需手动注册
const UserSchema = Type.Object({
  email: Type.String({ format: 'email' }),
  phone: Type.String({ format: 'phone' }),       // 中国手机号
  website: Type.String({ format: 'url' }),
  avatar: Type.String({ format: 'uuid' }),
  createdAt: Type.String({ format: 'date-time' }),
});

const handler = createHandler({ body: UserSchema }, ({ body }) => {
  return { success: true, user: body };
});
```

**支持的 Format 列表：**

| 分类 | Format | 说明 |
|------|--------|------|
| **标识符** | `email`, `uuid`, `cuid`, `cuid2`, `ulid`, `nanoid`, `objectid`, `slug` | 各种 ID 格式 |
| **网络** | `url`, `uri`, `ipv4`, `ipv6`, `ip`, `cidr`, `hostname` | 网络地址 |
| **日期时间** | `date`, `time`, `date-time`, `datetime`, `duration` | ISO 8601 格式 |
| **手机号** | `phone` (中国), `phone-cn`, `phone-e164` (国际) | 电话号码 |
| **编码** | `base64`, `base64url`, `jwt` | 编码格式 |
| **颜色** | `hex-color`, `rgb-color`, `color` | 颜色值 |
| **其他** | `emoji`, `semver`, `credit-card` | 特殊格式 |

**自定义 Format：**

```typescript
import { registerFormat, Patterns } from 'vafast';

// 注册自定义 format
registerFormat('order-id', (v) => /^ORD-\d{8}$/.test(v));

// 使用内置正则（供外部使用）
const isEmail = Patterns.EMAIL.test('test@example.com');
```

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

### 入门
- [快速开始](./docs/getting-started/quickstart.md)
- [示例代码](./examples/)

### 架构设计
- [路由设计与网关架构](./docs/router-design.md) - 声明式路由的设计哲学、AI 时代能力、网关优势
- [本地工具模式](./docs/local-tools-mode.md) - 声明式路由作为 AI Tools，无需 HTTP 服务

### 参考
- [服务器优化](./docs/server-optimization.md)
- [认证系统](./docs/auth.md)

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
