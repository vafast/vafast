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

```typescript
// ❌ Elysia - 链式 builder 模式，路由分散
const app = new Elysia()
  .get('/users', () => 'list')
  .post('/users', () => 'create')
  .get('/users/:id', ({ params }) => params.id)
  .use(plugin1)  // 插件在哪生效？
  .use(plugin2);

// ❌ Hono - 同样是链式，路由定义分散
const app = new Hono()
  .get('/users', (c) => c.text('list'))
  .post('/users', (c) => c.text('create'))
  .use('/*', cors());  // 全局中间件

// ✅ Vafast - 声明式数组，一眼看清所有路由
const routes = [
  { method: 'GET', path: '/users', handler: listUsers },
  { method: 'POST', path: '/users', handler: createUser },
  { method: 'GET', path: '/users/:id', middleware: [auth], handler: getUser }
];
```

### 错误即数据 — 不是混乱，是契约

```typescript
// ❌ Elysia - error() 返回，但无标准结构
app.get('/user', ({ error }) => {
  if (!user) return error(404, 'Not found');  // 字符串？对象？
});

// ❌ Hono - HTTPException，但格式自己定
import { HTTPException } from 'hono/http-exception';
throw new HTTPException(404, { message: 'Not found' });

// ✅ Vafast - 结构化错误，类型+状态+可见性
import { VafastError } from 'vafast';

throw new VafastError('用户不存在', {
  status: 404,
  type: 'not_found',
  expose: true  // 控制是否暴露给客户端
});
// 自动序列化: { type: 'not_found', message: '用户不存在' }
```

### 组合优于约定 — 显式优于隐式

```typescript
// ❌ Elysia - 插件作用域不清晰
const app = new Elysia()
  .use(cors())           // 全局？
  .group('/api', app => 
    app.use(auth())      // 只在 /api？要看文档
       .get('/users', handler)
  );

// ❌ Hono - use() 路径匹配容易出错
app.use('/*', cors());        // 全局
app.use('/api/*', auth());    // /api 下，但 /api 本身呢？

// ✅ Vafast - 每个路由的中间件一目了然
const routes = [
  { path: '/public', handler: publicHandler },              // 无中间件
  { path: '/api/users', middleware: [auth], handler },      // 仅 auth
  { path: '/admin', middleware: [auth, admin], handler }    // auth + admin
];
```

### 类型注入 — 跨文件不丢失

```typescript
// ❌ Hono - 类型绑定在 App 实例，跨文件丢失
// file: app.ts
type Env = { Variables: { user: User } };
const app = new Hono<Env>();

// file: routes.ts
export function setupRoutes(app: Hono) {  // 类型参数丢失！
  app.get('/profile', (c) => {
    const user = c.get('user');  // ❌ unknown
  });
}

// ❌ Elysia - 类型随链式调用传递，跨文件断裂
// file: plugin.ts
export const authPlugin = new Elysia()
  .derive(() => ({ user: { id: '1', role: 'admin' } }));

// file: app.ts
const app = new Elysia()
  .use(authPlugin)
  .get('/profile', ({ user }) => user);  // ⚠️ 类型可能丢失

// ✅ Vafast - 类型在 Handler 级别定义，天然独立
// file: types.ts
export type AuthContext = { user: { id: string; role: string } };

// file: handlers/profile.ts (任意位置，类型完整)
import { createHandlerWithExtra } from 'vafast';
import type { AuthContext } from '../types';

export const getProfile = createHandlerWithExtra<AuthContext>(
  (ctx) => {
    const user = ctx.user;  // ✅ { id: string; role: string }
    return { profile: user };
  }
);

// file: routes.ts
import { getProfile } from './handlers/profile';
const routes = [
  { method: 'GET', path: '/profile', middleware: [auth], handler: getProfile }
];
```

**Vafast 的设计：类型跟着 Handler 走，而不是跟着 App 实例走。**

### 边缘原生 — 一行代码，任意运行时

```typescript
// ✅ Bun
export default { port: 3000, fetch: server.fetch };

// ✅ Cloudflare Workers
export default { fetch: server.fetch };

// ✅ Node.js
import { serve } from '@vafast/node-server';
serve({ fetch: server.fetch, port: 3000 });
```

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

### 详细代码对比

<details>
<summary><b>📁 路由组织对比</b></summary>

```typescript
// ❌ Elysia - 路由分散在链式调用中
const app = new Elysia()
  .get('/users', listUsers)
  .post('/users', createUser)
  .get('/users/:id', getUser)
  .put('/users/:id', updateUser)
  .delete('/users/:id', deleteUser)
  .get('/posts', listPosts)      // 和 users 混在一起
  .post('/posts', createPost);

// ❌ Hono - 需要创建多个实例来组织
const users = new Hono();
users.get('/', listUsers);
users.post('/', createUser);
users.get('/:id', getUser);

const posts = new Hono();
posts.get('/', listPosts);

app.route('/users', users);
app.route('/posts', posts);

// ✅ Vafast - 结构清晰，一眼看全部
const routes = [
  // Users 模块
  { method: 'GET',    path: '/users',     handler: listUsers },
  { method: 'POST',   path: '/users',     handler: createUser },
  { method: 'GET',    path: '/users/:id', handler: getUser },
  { method: 'PUT',    path: '/users/:id', handler: updateUser },
  { method: 'DELETE', path: '/users/:id', handler: deleteUser },
  // Posts 模块
  { method: 'GET',    path: '/posts',     handler: listPosts },
  { method: 'POST',   path: '/posts',     handler: createPost },
];
```

</details>

<details>
<summary><b>🔗 嵌套路由与中间件继承</b></summary>

```typescript
// ❌ Elysia - group 嵌套，中间件作用域不清晰
const app = new Elysia()
  .use(globalLogger)
  .group('/api', (app) => 
    app
      .use(apiAuth)  // 只在 /api 下？
      .group('/users', (app) =>
        app
          .get('/', listUsers)
          .get('/:id', getUser)
      )
  );

// ❌ Hono - use() 路径匹配规则复杂
app.use('/*', logger);
app.use('/api/*', apiAuth);      // /api 本身有吗？
app.use('/api/admin/*', admin);  // 顺序重要吗？

// ✅ Vafast - 嵌套结构 + 显式中间件继承
const routes = [
  {
    path: '/api',
    middleware: [logger, apiAuth],
    children: [
      { method: 'GET', path: '/health', handler: healthCheck },
      {
        path: '/users',
        children: [
          { method: 'GET',    path: '/',    handler: listUsers },
          { method: 'GET',    path: '/:id', handler: getUser },
          { method: 'DELETE', path: '/:id', middleware: [adminOnly], handler: deleteUser },
        ]
      }
    ]
  }
];
// 清晰！DELETE /api/users/:id -> [logger, apiAuth, adminOnly]
```

</details>

<details>
<summary><b>🔒 跨文件类型安全</b></summary>

```typescript
// ❌ Hono - 跨文件类型丢失
// file: middleware/auth.ts
export const authMiddleware = createMiddleware(async (c, next) => {
  c.set('user', { id: '1', role: 'admin' });
  await next();
});

// file: routes/profile.ts
import { Hono } from 'hono';
const app = new Hono();
app.get('/profile', (c) => {
  const user = c.get('user');  // ❌ 类型是 unknown！
  return c.json(user);
});

// ❌ Elysia - 插件导出类型复杂
// file: plugins/auth.ts
export const authPlugin = new Elysia({ name: 'auth' })
  .derive(({ headers }) => ({
    user: decodeToken(headers.authorization)
  }));

// file: routes/profile.ts
import { authPlugin } from '../plugins/auth';
// 需要复杂的类型体操才能让 user 类型传递

// ✅ Vafast - Handler 级别类型定义，天然独立
// file: types/context.ts
export type AuthContext = { user: { id: string; role: string } };

// file: handlers/profile.ts (任意位置都能用！)
import { createHandlerWithExtra } from 'vafast';
import type { AuthContext } from '../types/context';

export const getProfile = createHandlerWithExtra<AuthContext>(
  (ctx) => {
    const user = ctx.user;  // ✅ 完整类型：{ id: string; role: string }
    return { 
      id: user.id, 
      isAdmin: user.role === 'admin'  // ✅ 类型安全
    };
  }
);

// file: handlers/admin.ts (另一个文件，类型同样完整)
import { createHandlerWithExtra, Type } from 'vafast';
import type { AuthContext } from '../types/context';

export const adminAction = createHandlerWithExtra<AuthContext>(
  { body: Type.Object({ action: Type.String() }) },
  (ctx) => {
    if (ctx.user.role !== 'admin') {  // ✅ 类型安全
      throw new VafastError('Forbidden', { status: 403 });
    }
    return { success: true, action: ctx.body.action };
  }
);
```

</details>

<details>
<summary><b>⚠️ 错误处理对比</b></summary>

```typescript
// ❌ Hono - HTTPException，但格式自己定
import { HTTPException } from 'hono/http-exception';

app.get('/user/:id', (c) => {
  const user = findUser(c.req.param('id'));
  if (!user) {
    throw new HTTPException(404, { message: 'User not found' });
    // 响应格式？自己猜
  }
  return c.json(user);
});

// ❌ Elysia - error() 返回，类型不统一
app.get('/user/:id', ({ params, error }) => {
  const user = findUser(params.id);
  if (!user) {
    return error(404, 'User not found');  // 字符串
    // 或 return error(404, { message: 'Not found' });  // 对象
    // 格式不统一
  }
  return user;
});

// ✅ Vafast - VafastError 契约，格式统一
import { VafastError } from 'vafast';

const getUser = createHandler(
  { params: Type.Object({ id: Type.String() }) },
  ({ params }) => {
    const user = findUser(params.id);
    if (!user) {
      throw new VafastError('User not found', {
        status: 404,
        type: 'not_found',
        expose: true  // 控制是否暴露给客户端
      });
    }
    return user;
  }
);
// 统一响应：{ type: 'not_found', message: 'User not found' }
```

</details>

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
