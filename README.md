# Vafast 🚀

[![npm version](https://badge.fury.io/js/vafast.svg)](https://badge.fury.io/js/vafast)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript)](https://www.typescriptlang.org/)

**超高性能的 TypeScript Web 框架，类型安全、轻量、快速。**

> Vafast 不只是框架，更是一种 **结构、清晰、可控** 的开发哲学。

## 🚀 快速开始

```bash
npx create-vafast-app
```

按照提示输入项目名称，然后运行：

```bash
cd my-vafast-app
npm install
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 即可看到 "Hello Vafast!"。

> 💡 想要手动配置？查看 [安装](#-安装) 部分。

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

### 方式一：使用脚手架（推荐）

使用官方脚手架快速创建项目：

```bash
npx create-vafast-app
```

### 方式二：手动安装

在现有项目中安装：

```bash
npm install vafast
```

然后创建 `index.ts`：

```typescript
import { Server, defineRoute, defineRoutes, serve } from 'vafast';

const routes = defineRoutes([
  defineRoute({
    method: 'GET',
    path: '/',
    handler: () => 'Hello Vafast!'
  })
]);

const server = new Server(routes);
serve({ fetch: server.fetch, port: 3000 }, (info) => {
  console.log(`🚀 Server running at http://localhost:${info.port}`);
});
```

运行：

```bash
npx tsx index.ts
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
import { Server, defineRoute, defineRoutes } from 'vafast';

const routes = defineRoutes([
  defineRoute({
    method: 'GET',
    path: '/users',
    handler: () => 'list users'
  }),
  defineRoute({
    method: 'POST',
    path: '/users',
    handler: ({ body }) => body
  }),
  defineRoute({
    method: 'GET',
    path: '/users/:id',
    handler: ({ params }) => `User ${params.id}`
  }),
]);

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
import { Server, defineRoute, defineRoutes, err } from 'vafast';

const routes = defineRoutes([
  defineRoute({
    method: 'GET',
    path: '/user',
    handler: ({ query }) => {
      const name = query.name;
      if (!name) {
        throw err.badRequest('Missing name');  // ✨ 简洁！
      }
      return `Hello, ${name}`;
    },
  }),
]);

const server = new Server(routes);
export default { fetch: server.fetch };
// 业务错误: HTTP 4xx/5xx + { code: number, message: string }
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
import { Server, defineRoute, defineRoutes, defineMiddleware } from 'vafast';

const authMiddleware = defineMiddleware(async (req, next) => {
  const token = req.headers.get('Authorization');
  if (!token) return new Response('Unauthorized', { status: 401 });
  return next();
});

const routes = defineRoutes([
  // 无中间件
  defineRoute({
    method: 'GET',
    path: '/public',
    handler: () => 'public'
  }),
  // 仅 auth
  defineRoute({
    method: 'GET',
    path: '/api/users',
    middleware: [authMiddleware],
    handler: () => 'users'
  }),
]);

const server = new Server(routes);
export default { fetch: server.fetch };
```

**对比：Vafast 的中间件直接声明在路由上，一目了然。**

### 扩展字段 — 声明式元数据，赋能业务逻辑

**其他框架的问题：**
- 路由定义和元数据分离，难以统一管理
- 需要额外的配置文件或装饰器来存储 webhook、权限、计费等信息
- 元数据查询需要遍历路由或维护独立映射表

**Vafast 完整示例：**
```typescript
import { Server, defineRoute, defineRoutes, getRouteRegistry, defineMiddleware } from 'vafast';

// 计费中间件（基于路由元数据）
const billingMiddleware = defineMiddleware(async (req, next) => {
  const route = getRouteRegistry().get(req.method, new URL(req.url).pathname);
  
  // 从路由元数据读取计费配置
  if (route?.billing) {
    const { price, currency } = route.billing;
    // 执行计费逻辑
    await chargeUser(req, price, currency);
  }
  
  return next();
});

const routes = defineRoutes([
  defineRoute({
    method: 'POST',
    path: '/ai/generate',
    name: 'AI 生成',
    description: '生成 AI 内容',
    // ✨ 扩展字段：计费配置
    billing: { price: 0.01, currency: 'USD' },
    // ✨ 扩展字段：Webhook 事件
    webhook: { eventKey: 'ai.generate', enabled: true },
    // ✨ 扩展字段：权限要求
    permission: 'ai.generate',
    middleware: [billingMiddleware],
    handler: async ({ body }) => {
      const result = await generateAI(body.prompt);
      return { result };
    }
  }),
  defineRoute({
    method: 'GET',
    path: '/users',
    // 免费 API，无需计费
    handler: () => ({ users: [] })
  }),
]);

const server = new Server(routes);

// 查询所有需要计费的 API
const paidRoutes = getRouteRegistry().filter('billing');
// 查询所有 Webhook 事件
const webhookRoutes = getRouteRegistry().filter('webhook');
// 按权限筛选
const aiRoutes = getRouteRegistry().filterBy(r => r.permission?.startsWith('ai.'));
```

**对比：Vafast 的扩展字段让路由定义成为单一数据源，元数据查询、中间件配置、业务逻辑都基于声明式配置。**

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
import { defineMiddleware } from 'vafast';
import type { AuthContext } from '../types';

// 使用 defineMiddleware 定义带类型的中间件
export const authMiddleware = defineMiddleware<AuthContext>(async (req, next) => {
  const user = await verifyToken(req.headers.get('Authorization'));
  return next({ user });  // 通过 next 传递上下文
});

// -------- file: handlers/profile.ts --------
import { defineRoute } from 'vafast';
import { authMiddleware } from '../middleware/auth';

// 类型在路由级别定义，任意文件都能用！
export const getProfileRoute = defineRoute({
  method: 'GET',
  path: '/profile',
  middleware: [authMiddleware],
  handler: ({ user }) => {
    // ✅ user 自动有类型: { id: string; role: string }
    return { profile: user, isAdmin: user.role === 'admin' };
  }
});

// -------- file: routes.ts --------
import { Server, defineRoutes } from 'vafast';
import { getProfileRoute } from './handlers/profile';

const routes = defineRoutes([
  getProfileRoute,
]);

const server = new Server(routes);
export default { fetch: server.fetch };
```

**对比：Vafast 的类型跟着 Handler 走，而不是跟着 App 实例走。**

### 边缘原生 — 一行代码，任意运行时

**Bun 环境完整示例：**
```typescript
import { Server, defineRoute, defineRoutes } from 'vafast';

const routes = defineRoutes([
  defineRoute({
    method: 'GET',
    path: '/',
    handler: () => 'Hello Bun!'
  })
]);

const server = new Server(routes);
export default { port: 3000, fetch: server.fetch };
```

**Cloudflare Workers 完整示例：**
```typescript
import { Server, defineRoute, defineRoutes } from 'vafast';

const routes = defineRoutes([
  defineRoute({
    method: 'GET',
    path: '/',
    handler: () => 'Hello Workers!'
  })
]);

const server = new Server(routes);
export default { fetch: server.fetch };
```

**Node.js 完整示例：**
```typescript
import { Server, defineRoute, defineRoutes, serve } from 'vafast';

const routes = defineRoutes([
  defineRoute({
    method: 'GET',
    path: '/',
    handler: () => 'Hello Node!'
  })
]);

const server = new Server(routes);
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

# ✅ Vafast - 使用脚手架一键创建
npx create-vafast-app

# ✅ 或手动创建 - 一个文件搞定
echo "import { Server, defineRoute, defineRoutes } from 'vafast';
const routes = defineRoutes([defineRoute({ method: 'GET', path: '/', handler: () => 'Hi' })]);
const server = new Server(routes);
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
| **扩展字段** | ❌ 不支持 | ❌ 不支持 | **✅ 任意扩展字段** |
| **元数据查询** | ❌ 需遍历 | ❌ 需遍历 | **✅ RouteRegistry API** |
| **业务集成** | ⚠️ 需额外配置 | ⚠️ 需额外配置 | **✅ 声明式集成** |
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
| **需要扩展字段（webhook、计费、权限）** | **✅ Vafast** |
| **需要元数据查询和筛选** | **✅ Vafast (RouteRegistry)** |
| **大型项目多文件拆分** | **✅ Vafast (类型不丢失)** |
| **团队协作类型安全** | **✅ Vafast** |
| **API 网关/微服务场景** | **✅ Vafast (声明式配置)** |
| 从 Express 迁移 | Hono (API 相似) |

## 🎯 核心功能

- ⚡ **JIT 编译验证器** - Schema 验证器编译缓存，避免重复编译
- 🌲 **Radix Tree 路由** - O(k) 时间复杂度的高效路由匹配（详见[路由规则](#路由匹配规则)）
- 🎯 **快速请求解析** - 优化的 Query/Cookie 解析，比标准方法快 2x
- 🔒 **端到端类型安全** - 完整的 TypeScript 类型推断
- 🧩 **灵活中间件系统** - 可组合的中间件架构
- 📡 **SSE 流式响应** - 内置 Server-Sent Events 支持，适用于 AI 聊天、进度更新等场景
- 📦 **零配置** - 开箱即用，无需复杂配置

### 路由匹配规则

Vafast 使用 Radix Tree 实现高效路由匹配，支持以下特性：

**1. 路由类型**

```typescript
// 静态路由
'/users'
'/api/v1/health'

// 动态参数 (:param)
'/users/:id'
'/posts/:postId/comments/:commentId'

// 通配符 (* 或 *name)
'/files/*'           // 匿名通配符，params['*']
'/static/*filepath'  // 命名通配符，params['filepath']
```

**2. 优先级规则（与 Hono/Fastify 一致）**

```
静态路由 > 动态参数 > 通配符
```

```typescript
// 注册顺序不影响优先级
router.register('GET', '/users/:id', dynamicHandler);
router.register('GET', '/users/admin', staticHandler);  // 后注册

// 匹配结果
GET /users/admin   → staticHandler  ✅ 静态优先
GET /users/123     → dynamicHandler
```

**3. 同一位置支持不同参数名**

不同路由在同一位置可以使用不同的参数名，每个路由独立返回其定义的参数名：

```typescript
// 同一位置（/sessions/ 后）使用不同参数名
router.register('PUT', '/sessions/:id', updateHandler);
router.register('GET', '/sessions/:sessionId/messages', messagesHandler);

// 每个路由返回各自定义的参数名
PUT /sessions/123           → params = { id: '123' }
GET /sessions/456/messages  → params = { sessionId: '456' }

// CRUD 场景完全支持
router.register('GET', '/users/:userId', getHandler);
router.register('PUT', '/users/:id', updateHandler);
router.register('DELETE', '/users/:uid', deleteHandler);

GET /users/1    → { userId: '1' }
PUT /users/2    → { id: '2' }
DELETE /users/3 → { uid: '3' }
```

> 💡 参数名冲突时会输出警告（建议保持一致），但不影响功能。

### 返回值与错误处理

Vafast 提供简洁、对称的响应 API：

```typescript
import { defineRoute, json, err } from 'vafast';

defineRoute({
  method: 'POST',
  path: '/users',
  handler: ({ body }) => {
    // ==================== 成功响应 ====================
    return body                    // 200 + JSON（自动转换）
    return json(body, 201)         // 201 Created
    return json(body, 200, {       // 自定义头部
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
    throw err.unprocessable('无法处理')  // 422
    throw err.internal('服务器错误')     // 500
    throw err('业务错误', 404, 40401)    // HTTP 404, code 40401
  }
})
```

**错误响应契约：**

| 场景 | HTTP | 响应体 |
|------|------|--------|
| 成功 | 2xx | 裸 JSON 业务数据 |
| Schema 校验失败 | **422** | `{ code: 422, message, details[] }` |
| 业务/鉴权错误 | 4xx/5xx | `{ code: number, message: string }` |

`code` 始终为 **number**（HTTP 状态码或业务码如 `40101`）。

**Schema 校验失败（422）** — 路由定义 `schema` 后自动生效，`details` 透传 TypeBox 原文：

```typescript
// POST body 校验失败示例响应
{
  "code": 422,
  "message": "请求参数校验失败",
  "details": [
    {
      "location": "body",
      "path": "/email",
      "field": "email",
      "message": "Expected string to match 'email' format",
      "value": "2212"
    },
    {
      "location": "body",
      "path": "/receiver/name",
      "field": "receiver.name",
      "message": "Expected string length greater or equal to 1",
      "value": ""
    }
  ]
}
```

- `path`：TypeBox JSON Pointer（`/orderIds/0`）
- `field`：表单字段路径（`orderIds.0`）
- `message`：**TypeBox 英文原文**，框架不做翻译

```typescript
import { ValidationFailedError, isValidationFailedError } from 'vafast';

// handler 内也可手动抛出（少见）
throw new ValidationFailedError([
  { location: 'body', path: '/email', field: 'email', message: '...' },
]);
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
| 无法处理 | `throw err.unprocessable()` | 422 |
| 服务器错误 | `throw err.internal()` | 500 |
| Schema 校验 | 自动（defineRoute.schema） | 422 + details |

### SSE 流式响应

通过 `sse: true` 显式声明 SSE 端点，适用于 AI 聊天、进度更新等场景。

**简单模式（推荐）** - 直接 yield 任意数据：

```typescript
import { defineRoute, defineRoutes, Type } from 'vafast'

const routes = defineRoutes([
  // AI 聊天场景
  defineRoute({
    method: 'POST',
    path: '/chat/stream',
    sse: true,
    schema: { body: Type.Object({ message: Type.String() }) },
    handler: async function* ({ body }) {
      // 直接 yield 数据，框架自动包装为 SSE data 字段
      yield { type: 'start', input: body.message }
      
      for await (const chunk of aiStream(body.message)) {
        yield { type: 'text_delta', content: chunk }
      }
      
      yield { type: 'done', usage: { tokens: 100 } }
    },
  }),
  
  // 进度更新场景
  defineRoute({
    method: 'GET',
    path: '/tasks/:taskId/progress',
    sse: true,
    schema: { params: Type.Object({ taskId: Type.String() }) },
    handler: async function* ({ params }) {
      for (let i = 0; i <= 100; i += 10) {
        yield { progress: i, taskId: params.taskId }
        await new Promise(r => setTimeout(r, 100))
      }
    },
  }),
])
```

**高级模式** - 需要设置 SSE event/id/retry 时使用 `sse()` 函数：

```typescript
import { sse } from 'vafast'

handler: async function* () {
  // 带事件名称
  yield sse({ event: 'status' }, { ready: true })

  // 带事件 ID 和重试间隔
  yield sse({ event: 'update', id: '42', retry: 5000 }, { value: 1 })
}
```

> 📖 详细文档见 [docs/sse.md](./docs/sse.md)

### 类型安全的路由

```typescript
import { Server, defineRoute, defineRoutes, Type } from 'vafast';

const routes = defineRoutes([
  defineRoute({
    method: 'POST',
    path: '/users',
    schema: {
      body: Type.Object({ name: Type.String(), email: Type.String() })
    },
    handler: ({ body }) => {
      // body.name 和 body.email 自动类型推断
      return { success: true, user: body };
    }
  })
]);

const server = new Server(routes);
export default { port: 3000, fetch: server.fetch };
```

### 路径参数

```typescript
defineRoute({
  method: 'GET',
  path: '/users/:id',
  schema: {
    params: Type.Object({ id: Type.String() })
  },
  handler: ({ params }) => ({ userId: params.id })
})
```

### 中间件

```typescript
import { defineMiddleware } from 'vafast';

const authMiddleware = defineMiddleware(async (req, next) => {
  const token = req.headers.get('Authorization');
  if (!token) return new Response('Unauthorized', { status: 401 });
  return next();
});

const routes = defineRoutes([
  defineRoute({
    method: 'GET',
    path: '/protected',
    middleware: [authMiddleware],
    handler: () => ({ secret: 'data' })
  })
]);
```

### 嵌套路由

```typescript
const routes = defineRoutes([
  defineRoute({
    path: '/api',
    middleware: [apiMiddleware],
    children: [
      defineRoute({
        method: 'GET',
        path: '/users',
        handler: getUsers
      }),
      defineRoute({
        method: 'POST',
        path: '/users',
        handler: createUser
      }),
      defineRoute({
        path: '/users/:id',
        children: [
          defineRoute({
            method: 'GET',
            path: '/',
            handler: getUser
          }),
          defineRoute({
            method: 'PUT',
            path: '/',
            handler: updateUser
          }),
          defineRoute({
            method: 'DELETE',
            path: '/',
            handler: deleteUser
          }),
        ]
      })
    ]
  })
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
import { defineRoute, defineRoutes, Type } from 'vafast';

// 直接使用内置 format，无需手动注册
const UserSchema = Type.Object({
  email: Type.String({ format: 'email' }),
  phone: Type.String({ format: 'phone' }),       // 中国手机号
  website: Type.String({ format: 'url' }),
  avatar: Type.String({ format: 'uuid' }),
  createdAt: Type.String({ format: 'date-time' }),
});

const routes = defineRoutes([
  defineRoute({
    method: 'POST',
    path: '/users',
    schema: { body: UserSchema },
    handler: ({ body }) => {
      return { success: true, user: body };
    }
  })
]);
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

### 路由注册表 (RouteRegistry) — 声明式元数据，赋能业务逻辑

Vafast 的声明式路由支持**任意扩展字段**，让路由定义成为业务逻辑的单一数据源。适用于 API 文档生成、Webhook 事件注册、权限检查、**按 API 计费**等场景：

```typescript
import { Server, defineRoute, defineRoutes, getRouteRegistry, defineMiddleware } from 'vafast';

// 计费中间件：基于路由元数据自动计费
const billingMiddleware = defineMiddleware(async (req, next) => {
  const registry = getRouteRegistry();
  const url = new URL(req.url);
  const route = registry.get(req.method, url.pathname);
  
  if (route?.billing) {
    const { price, currency, unit } = route.billing;
    const userId = getUserId(req);
    
    // 执行计费逻辑
    await chargeUser(userId, {
      api: `${req.method} ${url.pathname}`,
      price,
      currency,
      unit, // 'request' | 'token' | 'minute'
    });
  }
  
  return next();
});

// 定义带扩展字段的路由
const routes = defineRoutes([
  defineRoute({
    method: 'POST',
    path: '/auth/signIn',
    name: '用户登录',
    description: '用户通过邮箱密码登录',
    handler: signInHandler,
    // ✨ 扩展字段：Webhook 事件
    webhook: { eventKey: 'auth.signIn', enabled: true },
  }),
  defineRoute({
    method: 'POST',
    path: '/ai/generate',
    name: 'AI 生成',
    description: '生成 AI 内容',
    // ✨ 扩展字段：按请求计费
    billing: { price: 0.01, currency: 'USD', unit: 'request' },
    // ✨ 扩展字段：权限要求
    permission: 'ai.generate',
    middleware: [billingMiddleware],
    handler: async ({ body }) => {
      return await generateAI(body.prompt);
    }
  }),
  defineRoute({
    method: 'POST',
    path: '/ai/chat',
    name: 'AI 对话',
    // ✨ 扩展字段：按 token 计费
    billing: { price: 0.0001, currency: 'USD', unit: 'token' },
    permission: 'ai.chat',
    middleware: [billingMiddleware],
    handler: async ({ body }) => {
      return await chatAI(body.message);
    }
  }),
  defineRoute({
    method: 'GET',
    path: '/users',
    handler: getUsersHandler,
    permission: 'users.read',
    // 免费 API，无需计费配置
  }),
]);

const server = new Server(routes);

// Server 创建时自动设置全局注册表，直接使用即可
const registry = getRouteRegistry();

// 查询路由元信息
const route = registry.get('POST', '/ai/generate');
console.log(route?.name);        // 'AI 生成'
console.log(route?.billing);     // { price: 0.01, currency: 'USD', unit: 'request' }
console.log(route?.permission);  // 'ai.generate'

// 筛选有特定字段的路由
const webhookRoutes = registry.filter('webhook');      // 所有 Webhook 事件
const paidRoutes = registry.filter('billing');         // 所有付费 API
const aiRoutes = registry.filterBy(r => r.permission?.startsWith('ai.')); // AI 相关 API

// 按分类获取
const authRoutes = registry.getByCategory('auth');
const aiCategoryRoutes = registry.getByCategory('ai');

// 获取所有分类
const categories = registry.getCategories();  // ['auth', 'ai', 'users']
```

**扩展字段的优势：**

1. **单一数据源**：路由定义包含所有元数据，无需额外配置文件
2. **类型安全**：扩展字段在 TypeScript 中完全类型化
3. **运行时查询**：通过 `RouteRegistry` API 动态查询和筛选
4. **业务集成**：中间件可直接读取路由元数据，实现计费、权限、审计等功能
5. **API 网关友好**：声明式配置完美适配网关场景

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

**全局便捷函数（Server 创建后自动可用）：**

```typescript
import {
  getRouteRegistry,  // 获取全局注册表实例
  getRoute,          // 快速查询单个路由
  getAllRoutes,      // 获取所有路由
  filterRoutes,      // 按字段筛选
  getRoutesByMethod, // 按 HTTP 方法获取
} from 'vafast'

// 方式一：使用全局注册表实例
const registry = getRouteRegistry()
const route = registry.get('POST', '/users')

// 方式二：使用便捷函数（推荐，更简洁）
const route = getRoute('POST', '/users')
const allRoutes = getAllRoutes()
const webhookRoutes = filterRoutes('webhook')
const getRoutes = getRoutesByMethod('GET')
const postRoutes = getRoutesByMethod('POST')

// 按路径前缀筛选
const authRoutes = getAllRoutes().filter(r => r.path.startsWith('/auth'))
```

> 💡 **提示**：Server 创建时会自动设置全局 RouteRegistry，无需手动创建。在任意文件中导入 `getRouteRegistry()` 即可访问。

### API Spec 生成

Vafast 提供 `getApiSpec` 用于生成 API 规范，支持跨仓库类型同步和 AI 工具函数生成：

```typescript
import { Server, defineRoute, defineRoutes, getApiSpec } from 'vafast';

const routes = defineRoutes([
  defineRoute({
    method: 'GET',
    path: '/users',
    handler: getUsers
  }),
  defineRoute({
    method: 'POST',
    path: '/users',
    handler: createUser
  }),
  // 添加 API Spec 接口
  defineRoute({
    method: 'GET',
    path: '/api-spec',
    handler: getApiSpec  // 直接作为 handler
  }),
]);

const server = new Server(routes);
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
npm install -D @vafast/cli

# 从服务端同步类型
npx vafast sync --url http://localhost:9002 \
  --endpoint /restfulApi/api-spec \
  --out src/types/api/ones.generated.ts \
  --strip-prefix /restfulApi
```

**生成的类型文件：**

```typescript
// src/types/api/ones.generated.ts
import type { Client, EdenClient } from '@vafast/api-client'
import { eden } from '@vafast/api-client'

export type Api = {
  users: {
    get: { query: { page?: number }; return: any }
    post: { body: { name: string; email: string }; return: any }
  }
}

export function createApiClient(client: Client): EdenClient<Api> {
  return eden<Api>(client)
}

// 使用
import { createClient } from '@vafast/api-client'
import { createApiClient } from './types/api/ones.generated'

const client = createClient({ baseURL: '/restfulApi', timeout: 30000 })
const api = createApiClient(client)

const { data, error } = await api.users.get({ page: 1 })
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
