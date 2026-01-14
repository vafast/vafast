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
npm install vafast
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
import { Server, createHandler, err } from 'vafast';
import type { Route } from 'vafast';

const routes: Route[] = [
  {
    method: 'GET',
    path: '/user',
    handler: createHandler((ctx) => {
      const name = ctx.query.name;
      if (!name) {
        throw err.badRequest('Missing name');  // ✨ 简洁！
      }
      return `Hello, ${name}`;
    }),
  },
];

const server = new Server(routes);
export default { fetch: server.fetch };
// 错误响应: { error: 'BAD_REQUEST', message: 'Missing name' }
```

**对比：Vafast 的 `err()` 函数提供语义化的错误 API，统一的响应格式。**

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
import { Server, createHandler, serve } from 'vafast';

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
- 🌲 **Radix Tree 路由** - O(k) 时间复杂度的高效路由匹配
- 🎯 **快速请求解析** - 优化的 Query/Cookie 解析，比标准方法快 2x
- 🔒 **端到端类型安全** - 完整的 TypeScript 类型推断
- 🧩 **灵活中间件系统** - 可组合的中间件架构
- 📦 **零配置** - 开箱即用，无需复杂配置

### 返回值与错误处理

Vafast 提供简洁、对称的响应 API：

```typescript
import { createHandler, json, err } from 'vafast';

// ==================== 成功响应 ====================
return user                    // 200 + JSON（自动转换）
return json(user, 201)         // 201 Created
return json(user, 200, {       // 自定义头部
  'X-Request-Id': 'abc123'
})
return 'Hello'                 // 200 + text/plain
return new Response(...)       // 完全控制

// ==================== 错误响应 ====================
throw err.badRequest('参数错误')     // 400
throw err.unauthorized('请先登录')   // 401
throw err.forbidden('无权限')        // 403
throw err.notFound('用户不存在')     // 404
throw err.conflict('用户名已存在')   // 409
throw err.internal('服务器错误')     // 500
throw err('自定义错误', 422, 'CUSTOM_TYPE')  // 自定义
```

**API 速查表：**

| 场景 | 写法 | 结果 |
|------|------|------|
| 查询成功 | `return data` | 200 + JSON |
| 创建成功 | `return json(data, 201)` | 201 + JSON |
| 参数错误 | `throw err.badRequest()` | 400 |
| 未授权 | `throw err.unauthorized()` | 401 |
| 禁止访问 | `throw err.forbidden()` | 403 |
| 未找到 | `throw err.notFound()` | 404 |
| 资源冲突 | `throw err.conflict()` | 409 |
| 服务器错误 | `throw err.internal()` | 500 |

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

### 父级中间件类型注入 (withContext)

当中间件在父级定义，子路由需要使用 `withContext` 获得类型推断：

```typescript
import { defineRoute, defineRoutes, withContext } from 'vafast'

// 创建带 UserInfo 上下文的路由定义器
const defineAuthRoute = withContext<{ userInfo: UserInfo }>()

const routes = defineRoutes([
  defineRoute({
    path: '/api',
    middleware: [authMiddleware],  // 父级中间件注入 userInfo
    children: [
      defineAuthRoute({  // ← 使用 defineAuthRoute
        method: 'GET',
        path: '/profile',
        handler: ({ userInfo }) => {
          // ✅ userInfo 自动有类型！
          return { id: userInfo.id }
        }
      })
    ]
  })
])
```

> 📖 详细文档：[withContext 使用指南](./docs/with-context.md)

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
| **标识符** | `email`, `uuid`, `uuid-any`, `cuid`, `cuid2`, `ulid`, `nanoid`, `objectid`, `slug` | 各种 ID 格式 |
| **网络** | `url`, `uri`, `ipv4`, `ipv6`, `ip`, `cidr`, `hostname` | 网络地址 |
| **日期时间** | `date`, `time`, `date-time`, `datetime`, `duration` | ISO 8601 格式 |
| **手机号** | `phone` (中国), `phone-cn`, `phone-e164` (国际) | 电话号码 |
| **编码** | `base64`, `base64url`, `jwt` | 编码格式 |
| **颜色** | `hex-color`, `rgb-color`, `color` | 颜色值 |
| **其他** | `emoji`, `semver`, `credit-card` | 特殊格式 |

> **源码位置：** `src/utils/formats.ts` - 框架启动时自动注册所有 format 验证器

**自定义 Format：**

```typescript
import { registerFormat, Patterns } from 'vafast';

// 注册自定义 format
registerFormat('order-id', (v) => /^ORD-\d{8}$/.test(v));

// 使用内置正则（供外部使用）
const isEmail = Patterns.EMAIL.test('test@example.com');
```

### 路由注册表 (RouteRegistry)

Vafast 提供 `RouteRegistry` 用于路由元信息的收集和查询，适用于 API 文档生成、Webhook 事件注册、权限检查等场景：

```typescript
import { Server, createRouteRegistry } from 'vafast';
import type { Route } from 'vafast';

// 定义带扩展字段的路由
const routes: Route[] = [
  {
    method: 'POST',
    path: '/auth/signIn',
    handler: signInHandler,
    name: '用户登录',                    // 扩展字段
    description: '用户通过邮箱密码登录',   // 扩展字段
    webhook: { eventKey: 'auth.signIn' }, // 自定义扩展
  },
  {
    method: 'GET',
    path: '/users',
    handler: getUsersHandler,
    permission: 'users.read',            // 自定义扩展
  },
];

const server = new Server(routes);

// 创建路由注册表
const registry = createRouteRegistry(server.getRoutesWithMeta());

// 查询路由
const route = registry.get('POST', '/auth/signIn');
console.log(route?.name);  // '用户登录'

// 按分类获取
const authRoutes = registry.getByCategory('auth');

// 筛选有特定字段的路由
const webhookRoutes = registry.filter('webhook');
const permissionRoutes = registry.filter('permission');

// 获取所有分类
const categories = registry.getCategories();  // ['auth', 'users']
```

**Registry 实例方法：**

| 方法 | 说明 |
|------|------|
| `getAll()` | 获取所有路由元信息 |
| `get(method, path)` | 按 method+path 查询 |
| `has(method, path)` | 检查路由是否存在 |
| `getByCategory(category)` | 按分类获取路由 |
| `getCategories()` | 获取所有分类 |
| `filter(field)` | 筛选有特定字段的路由 |
| `filterBy(predicate)` | 自定义条件筛选 |
| `forEach(callback)` | 遍历所有路由 |
| `map(callback)` | 映射所有路由 |
| `size` | 路由数量 |

**全局便捷函数：**

```typescript
import {
  getRoute,
  getAllRoutes,
  filterRoutes,
  getRoutesByMethod,
} from 'vafast'

// 获取单个路由
const route = getRoute('POST', '/users')

// 获取所有路由
const allRoutes = getAllRoutes()

// 按字段筛选
const webhookRoutes = filterRoutes('webhook')

// 按 HTTP 方法获取
const getRoutes = getRoutesByMethod('GET')
const postRoutes = getRoutesByMethod('POST')

// 按路径前缀筛选（自己 filter）
const authRoutes = getAllRoutes().filter(r => r.path.startsWith('/auth'))
```

### API Spec 生成

Vafast 提供 `getApiSpec` 用于生成 API 规范，支持跨仓库类型同步和 AI 工具函数生成：

```typescript
import { Server, defineRoutes, getApiSpec } from 'vafast';

const routes = defineRoutes([
  { method: 'GET', path: '/users', handler: getUsers },
  { method: 'POST', path: '/users', handler: createUser },
]);

// 添加 API Spec 接口
const allRoutes = [
  ...routes,
  { method: 'GET', path: '/api-spec', handler: getApiSpec }  // 直接作为 handler
];

const server = new Server(allRoutes);
```

**三种使用方式：**

```typescript
// 方式 1：直接作为 handler（推荐，最简洁）
{ method: 'GET', path: '/api-spec', handler: getApiSpec }

// 方式 2：显式传参（只暴露公开 API）
{ handler: () => getApiSpec(publicRoutes) }

// 方式 3：本地使用（CLI、测试）
const spec = getApiSpec()
```

**返回格式：**

```json
{
  "version": "1.0.0",
  "generatedAt": "2024-01-01T00:00:00.000Z",
  "routes": [
    {
      "method": "GET",
      "path": "/users",
      "name": "get_users",
      "description": "获取用户列表",
      "schema": { "query": { "type": "object", ... } }
    }
  ]
}
```

### AI 工具函数生成

`generateAITools` 可将路由转换为 OpenAI Function Calling / Claude Tools 格式：

```typescript
import { generateAITools } from 'vafast';

const tools = generateAITools(routes);
// [
//   { name: 'get_users', description: '获取用户列表', parameters: {...} },
//   { name: 'create_user', description: '创建用户', parameters: {...} }
// ]

// 直接用于 AI 调用
const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [...],
  tools: tools.map(t => ({ type: 'function', function: t }))
});
```

### 跨仓库类型同步 (CLI)

对于多仓库项目，使用 `@vafast/cli` 从远程服务同步类型：

```bash
# 安装 CLI
npm install -g @vafast/cli

# 从服务端同步类型
vafast sync --url http://api.example.com --out src/api.generated.ts
```

**生成的类型文件：**

```typescript
// src/api.generated.ts
export interface Api {
  users: {
    get: { query: { page?: number } }
    post: { body: { name: string; email: string } }
  }
}

// 使用
import { eden } from '@vafast/api-client'
import type { Api } from './api.generated'

const api = eden<Api>('http://api.example.com')
const { data } = await api.users.get({ query: { page: 1 } })
```

## 📊 内置监控

零依赖的性能监控，一行代码启用：

```typescript
import { Server } from 'vafast';
import { withMonitoring } from 'vafast/monitoring';

const server = new Server(routes);
const monitored = withMonitoring(server, {
  slowThreshold: 500,
  excludePaths: ['/health']
});

// 获取监控状态
const status = monitored.getMonitoringStatus();
console.log(`P99: ${status.p99}ms, RPS: ${status.rps}`);
```

**特性：**
- P50/P95/P99 百分位数
- 时间窗口统计（1分钟/5分钟/1小时）
- RPS 计算、状态码分布
- 按路径统计、内存监控
- 采样率控制、路径排除
- 自定义回调（onRequest/onSlowRequest）

## 🔧 运行时支持

```typescript
import { serve } from 'vafast';
serve({ fetch: server.fetch, port: 3000 }, (info) => {
  console.log(`🚀 Server running at http://localhost:${info.port}`);
});
```

> 💡 `serve` 函数兼容 Bun 和 Node.js，代码无需修改即可跨运行时

**Bun 原生写法（仅限 Bun）：**
```typescript
export default { port: 3000, fetch: server.fetch };
```

## 📚 文档

### 入门
- [快速开始](./docs/getting-started/quickstart.md)
- [示例代码](./examples/)


### 核心概念
- [withContext 使用指南](./docs/with-context.md) - 父级中间件类型注入，解决跨路由类型推断
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
npm install
npm test
```

## 🚀 发布流程

**一条命令完成发布：**

```bash
npm run release
```

**自动完成：**
1. ✅ `bumpp` 交互式选择版本（patch/minor/major）
2. ✅ 更新 `package.json` 版本号
3. ✅ 创建 git commit + tag
4. ✅ 推送到 GitHub
5. ✅ GitHub Actions 自动触发：
   - 构建 + 测试
   - `changelogithub` 生成 Release Notes
   - 创建 GitHub Release
   - 发布到 npm（Trusted Publishing）

**Commit 规范（用于生成 changelog）：**

```bash
feat: 新增功能      # → 🚀 Features
fix: 修复问题       # → 🐛 Bug Fixes
docs: 更新文档      # → 📝 Documentation
perf: 性能优化      # → ⚡ Performance
refactor: 重构     # → ♻️ Refactors
chore: 杂项        # → 🏠 Chores
```

## 📄 许可证

[MIT](./LICENSE)

---

**Vafast** - 让 Web 开发更快、更安全、更高效！
