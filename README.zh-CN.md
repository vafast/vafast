# Vafast 🚀

[English](README.md) | [中文](README.zh-CN.md)

[![npm version](https://img.shields.io/npm/v/vafast.svg)](https://www.npmjs.com/package/vafast)
[![npm downloads](https://img.shields.io/npm/dm/vafast.svg)](https://www.npmjs.com/package/vafast)
[![CI](https://github.com/vafast/vafast/actions/workflows/ci.yml/badge.svg)](https://github.com/vafast/vafast/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript)](https://www.typescriptlang.org/)

**超高性能的 TypeScript Web 框架，类型安全、轻量、快速。**

Vafast 不只是框架，更是一种 **结构、清晰、可控** 的开发哲学。为边缘计算而生，一流支持 Bun、Node.js 和 Cloudflare Workers。

📖 **文档:** [中文](https://vafast.okayok.ai) | [English](https://vafast.okayok.ai/en/) | [文档仓库](https://github.com/vafast/vafast-docs)

---

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

---

## 📦 安装

### 方式一：使用脚手架（推荐）

```bash
npx create-vafast-app
```

### 方式二：手动安装

```bash
npm install vafast
```

创建 `index.ts`：

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

---

## ⚡ 性能

| 框架 | RPS | 相对性能 |
|------|-----|----------|
| Elysia | ~118K | 100% |
| **Vafast** | **~101K** | **86%** |
| Express | ~56K | 48% |
| Hono | ~56K | 47% |

> **Vafast 比 Express/Hono 快约 1.8x！**  
> 测试环境：Bun 1.2.20, macOS, wrk 基准测试 (4线程, 100连接, 30s)

---

## 🎯 核心功能

- ⚡ **JIT 编译验证器** - Schema 验证器编译缓存，避免重复编译
- 🌲 **Radix Tree 路由** - O(k) 时间复杂度的高效路由匹配
- 🎯 **快速请求解析** - 优化的 Query/Cookie 解析，比标准方法快 2x
- 🔒 **端到端类型安全** - 完整的 TypeScript 类型推断
- 🧩 **灵活中间件系统** - 可组合的中间件架构
- 📡 **SSE 流式响应** - 内置 Server-Sent Events 支持，适用于 AI 聊天、进度更新等场景
- 🌍 **边缘原生** - 同一套代码运行在 Bun、Node.js 和 Cloudflare Workers
- 📦 **零配置** - 开箱即用，无需复杂配置

---

## 💡 设计哲学

### 1. 结构即真相 — 无装饰器，无链式魔法

**其他框架** 使用链式调用，路由分散难以一览：

```typescript
// Elysia / Hono
const app = new Hono()
  .get('/users', handler1)
  .post('/users', handler2)
  .get('/users/:id', handler3)
  .use(somePlugin);  // 作用域不明确
```

**Vafast** 使用声明式路由——一个数组看清所有端点：

```typescript
import { Server, defineRoute, defineRoutes } from 'vafast';

const routes = defineRoutes([
  defineRoute({ method: 'GET', path: '/users', handler: () => 'list' }),
  defineRoute({ method: 'POST', path: '/users', handler: ({ body }) => body }),
  defineRoute({ method: 'GET', path: '/users/:id', handler: ({ params }) => params.id }),
]);

const server = new Server(routes);
```

路由即数据。一目了然。

### 2. 错误即数据 — 不是混乱，是契约

**其他框架** 抛出非结构化错误：

```typescript
// Hono
throw new HTTPException(400, { message: 'Missing name' });
// 响应格式不统一
```

**Vafast** 提供语义化的错误 API，统一的响应格式：

```typescript
import { err } from 'vafast';

throw err.badRequest('参数错误');
throw err.unauthorized('请先登录');
throw err.notFound('用户不存在');

// 所有错误: { code: number, message: string }
// Schema 校验错误: { code: 422, message: string, details: [...] }
```

### 3. 组合优于约定 — 显式优于隐式

**其他框架** 使用全局中间件和路径匹配：

```typescript
// Hono
app.use('/*', cors());           // 全局
app.use('/api/*', auth);         // /api/* 但 /api 本身呢？
```

**Vafast** 在路由上显式声明中间件：

```typescript
const routes = defineRoutes([
  defineRoute({
    method: 'GET',
    path: '/public',
    handler: () => 'public'
  }),
  defineRoute({
    method: 'GET',
    path: '/api/users',
    middleware: [authMiddleware],  // 在此声明，作用域清晰
    handler: () => 'users'
  }),
]);
```

### 4. 扩展字段 — 声明式元数据，赋能业务逻辑

**Vafast** 支持路由定义中的任意扩展字段，用于 webhook、权限、计费等：

```typescript
import { defineRoute, defineRoutes, getRouteRegistry } from 'vafast';

const routes = defineRoutes([
  defineRoute({
    method: 'POST',
    path: '/ai/generate',
    name: 'AI 生成',
    billing: { price: 0.01, currency: 'USD' },  // ✨ 自定义字段
    webhook: { eventKey: 'ai.generate' },       // ✨ 自定义字段
    permission: 'ai.generate',                  // ✨ 自定义字段
    handler: async ({ body }) => generateAI(body.prompt)
  }),
]);

// 按元数据查询路由
const paidRoutes = getRouteRegistry().filter('billing');
const webhookRoutes = getRouteRegistry().filter('webhook');
```

路由成为 API 的单一数据源。

### 5. 类型注入 — 跨文件不丢失

**其他框架** 拆分文件后类型丢失：

```typescript
// Hono
export function setupRoutes(app: Hono) {
  app.get('/profile', (c) => {
    const user = c.get('user');  // ❌ 类型是 unknown
  });
}
```

**Vafast** 通过 `withContext` 保留类型：

```typescript
import { defineMiddleware, withContext } from 'vafast';

const authMiddleware = defineMiddleware<{ user: User }>(async (req, next) => {
  const user = await verifyToken(req.headers.get('Authorization'));
  return next({ user });
});

const defineAuthRoute = withContext<{ user: User }>();

export const profileRoute = defineAuthRoute({
  method: 'GET',
  path: '/profile',
  middleware: [authMiddleware],
  handler: ({ user }) => {
    // ✅ user 自动有类型: User
    return { profile: user };
  }
});
```

类型跟着 Handler 走，而不是跟着 App 实例走。

### 6. 边缘原生 — 一行代码，任意运行时

同一套代码，不同导出方式：

```typescript
import { Server, defineRoute, defineRoutes } from 'vafast';

const routes = defineRoutes([
  defineRoute({ method: 'GET', path: '/', handler: () => 'Hello!' })
]);

const server = new Server(routes);

// Bun
export default { port: 3000, fetch: server.fetch };

// Cloudflare Workers
export default { fetch: server.fetch };

// Node.js
import { serve } from 'vafast';
serve({ fetch: server.fetch, port: 3000 });
```

---

## 📘 使用示例

### 类型安全的路由与 Schema 验证

```typescript
import { Server, defineRoute, defineRoutes, Type } from 'vafast';

const routes = defineRoutes([
  defineRoute({
    method: 'POST',
    path: '/users',
    schema: {
      body: Type.Object({
        name: Type.String({ minLength: 1 }),
        email: Type.String({ format: 'email' })
      })
    },
    handler: ({ body }) => {
      // body.name 和 body.email 自动类型推断
      return { success: true, user: body };
    }
  })
]);

const server = new Server(routes);
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
      defineRoute({ method: 'GET', path: '/users', handler: getUsers }),
      defineRoute({ method: 'POST', path: '/users', handler: createUser }),
      defineRoute({
        path: '/users/:id',
        children: [
          defineRoute({ method: 'GET', path: '/', handler: getUser }),
          defineRoute({ method: 'PUT', path: '/', handler: updateUser }),
          defineRoute({ method: 'DELETE', path: '/', handler: deleteUser }),
        ]
      })
    ]
  })
]);
```

### SSE 流式响应（AI 聊天、进度更新）

```typescript
import { defineRoute, defineRoutes } from 'vafast';

const routes = defineRoutes([
  defineRoute({
    method: 'POST',
    path: '/chat/stream',
    sse: true,  // 启用 SSE
    handler: async function* ({ body }) {
      yield { type: 'start', input: body.message };
      
      for await (const chunk of aiStream(body.message)) {
        yield { type: 'text_delta', content: chunk };
      }
      
      yield { type: 'done' };
    },
  }),
]);
```

### 响应辅助函数与错误处理

```typescript
import { defineRoute, json, err } from 'vafast';

defineRoute({
  method: 'POST',
  path: '/users',
  handler: ({ body }) => {
    // 成功响应
    return body;                      // 200 + JSON（自动转换）
    return json(body, 201);           // 201 Created
    return json(body, 200, {          // 自定义头部
      'X-Request-Id': 'abc123'
    });
    return 'Hello';                   // 200 + text/plain
    return new Response(...);         // 完全控制

    // 错误响应（统一格式）
    throw err.badRequest('参数错误');      // 400
    throw err.unauthorized('请先登录');   // 401
    throw err.forbidden('无权限');        // 403
    throw err.notFound('用户不存在');     // 404
    throw err.conflict('用户名已存在');   // 409
    throw err.unprocessable('无法处理')  // 422
    throw err.internal('服务器错误');     // 500
    throw err('业务错误', 404, 40401);    // HTTP 404, code 40401
  }
});
```

**错误响应契约：**

| 场景 | HTTP | 响应体 |
|------|------|--------|
| 成功 | 2xx | 裸 JSON 业务数据 |
| Schema 校验失败 | **422** | `{ code: 422, message, details[] }` |
| 业务/鉴权错误 | 4xx/5xx | `{ code: number, message: string }` |

---

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

---

## 📚 文档

### 入门
- [快速开始](./docs/getting-started/quickstart.md)
- [示例代码](./examples/)

### 核心概念
- [withContext 使用指南](./docs/with-context.md) - 父级中间件类型注入
- [路由设计与网关架构](./docs/router-design.md) - 设计哲学与 AI 时代能力
- [本地工具模式](./docs/local-tools-mode.md) - 声明式路由作为 AI Tools，无需 HTTP 服务

### 高级
- [SSE (Server-Sent Events)](./docs/sse.md)
- [服务器优化](./docs/server-optimization.md)
- [认证系统](./docs/auth.md)

### 参考
- [API Spec 生成](./docs/getting-started/quickstart.md#api-spec-生成)
- [RouteRegistry API](./docs/router-design.md)

**完整文档:** [https://vafast.okayok.ai](https://vafast.okayok.ai) (中文) | [https://vafast.okayok.ai/en/](https://vafast.okayok.ai/en/) (English)

---

## 🤝 贡献

欢迎贡献！请查看 [贡献指南](./CONTRIBUTING.md)。

```bash
git clone https://github.com/vafast/vafast.git
cd vafast
npm install
npm test
```

---

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

---

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

---

## 📄 许可证

[MIT](./LICENSE)

---

**Vafast** — 让 Web 开发更快、更安全、更高效！
