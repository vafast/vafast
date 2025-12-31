# Vafast 路由设计与网关架构

## 目录

1. [路由设计哲学](#路由设计哲学)
2. [链式 vs 声明式对比](#链式-vs-声明式对比)
3. [路由组实现方案](#路由组实现方案)
4. [声明式路由的想象力](#声明式路由的想象力)
5. [作为网关的优势](#作为网关的优势)

---

## 路由设计哲学

### 核心原则

Vafast 路由采用 **Vue Router 风格**的声明式设计：

```typescript
const routes = [
  { method: 'GET', path: '/', handler: home },
  { method: 'GET', path: '/users', handler: listUsers },
  { method: 'GET', path: '/users/:id', handler: getUser },
  {
    path: '/api',
    middleware: [cors()],
    children: [
      { method: 'GET', path: '/health', handler: healthCheck },
      {
        path: '/v1',
        middleware: [rateLimit()],
        children: [
          { method: 'GET', path: '/posts', handler: listPosts },
        ]
      }
    ]
  }
]
```

### 设计映射

| Vue Router | Vafast | 说明 |
|------------|--------|------|
| `path` | `path` | 路径 |
| `component` | `handler` | 处理器 |
| `children` | `children` | 子路由 |
| `meta` | `meta` / `middleware` | 元数据/守卫 |
| `beforeEnter` | `middleware` | 路由中间件 |
| `name` | `name` | 路由命名 |
| - | `method` | HTTP 方法（后端特有） |

---

## 链式 vs 声明式对比

### 代码对比

**链式写法：**
```typescript
const app = vafast()
  .use(cors())
  .get('/users', listUsers)
  .post('/users', createUser)
  .group('/api/v1', { middleware: [auth] }, (api) =>
    api.get('/posts', listPosts)
  )
```

**声明式写法：**
```typescript
const routes = [
  { method: 'GET', path: '/users', handler: listUsers },
  { method: 'POST', path: '/users', handler: createUser },
  {
    path: '/api/v1',
    middleware: [auth],
    children: [
      { method: 'GET', path: '/posts', handler: listPosts },
    ]
  }
]
app.addRoutes(routes)
```

### 详细对比

| 维度 | 链式写法 | 声明式写法 |
|------|----------|------------|
| **可读性** | 流畅，像自然语言 | 结构清晰，层级分明 |
| **可写性** | 写起来爽，IDE 补全友好 | 需要记住结构，但模板化 |
| **调试** | 难以在中间断点 | 数据可打印、可断点 |
| **序列化** | ❌ 函数无法序列化 | ✅ 可 JSON 存储/传输 |
| **动态生成** | 需要循环调用方法 | 直接操作数组/对象 |
| **类型推断** | 逐步推断，链长时可能丢失 | 整体定义，类型稳定 |
| **顺序依赖** | 顺序敏感（中间件顺序） | 显式声明，顺序可控 |
| **测试** | 需要 mock 整个链 | 直接断言数据结构 |
| **代码拆分** | 需要返回 this 或 builder | 天然可拆分合并数组 |
| **学习曲线** | 低，直观 | 中，需理解配置结构 |

### 框架选择参考

| 框架 | 主要风格 | 备注 |
|------|----------|------|
| Express | 链式 | 经典，类型弱 |
| Fastify | **声明式** | Schema 驱动，性能优先 |
| Hono | 链式 | 轻量，边缘计算 |
| Elysia | 链式 | 类型体操，Bun 优先 |
| NestJS | **声明式(装饰器)** | 企业级 |
| tRPC | **声明式** | 类型优先 |

### 未来趋势

| 时间线 | 趋势 |
|--------|------|
| 当前 | 链式仍是主流 |
| 2-3年 | 声明式增长（TypeScript 生态） |
| 5年后 | **混合模式**成为标准 |

**推荐方向**：声明式定义 + 链式组装

```typescript
// 声明式定义（可测试、可序列化）
const userRoutes = [
  { method: 'GET', path: '/users', handler: listUsers },
]

// 链式组装（灵活、动态）
app.use(cors()).addRoutes(userRoutes)
```

---

## 路由组实现方案

### 方案一：回调嵌套（当前）

```typescript
app.group('/api', (api) =>
  api.group('/v1', (v1) =>
    v1.get('/users', handler)
  )
)
```

### 方案二：独立路由器 + mount

```typescript
const users = vafast()
  .get('/', listUsers)
  .get('/:id', getUser)

app.mount('/api/users', users, { middleware: [auth] })
```

### 方案三：数组 + prefix 函数

```typescript
function prefix(basePath, routes, config) {
  return routes.map(r => ({
    ...r,
    path: basePath + r.path,
    middleware: [...(config?.middleware || []), ...(r.middleware || [])]
  }))
}

app.addRoutes(prefix('/api/v1', userRoutes, { middleware: [auth] }))
```

### 方案四：对象字面量

```typescript
const routes = {
  '/api': {
    _middleware: [cors()],
    '/v1': {
      'GET /users': listUsers,
      'POST /users': createUser,
    }
  }
}
```

### 方案五：插件式

```typescript
export const usersPlugin = (app) => {
  return app
    .get('/users', listUsers)
    .post('/users', createUser)
}

app.basePath('/api/v1').use(usersPlugin)
```

---

## 声明式路由的想象力

### 1. 自动生成 API 文档

```typescript
const routes = [
  {
    method: 'POST',
    path: '/users',
    handler: createUser,
    body: CreateUserSchema,
    meta: { summary: '创建用户', tags: ['用户'] }
  }
]

app.generateOpenAPI()  // 自动生成 Swagger
```

### 2. 可视化路由编辑器

- 拖拽式 API 设计
- 低代码平台集成
- 类似 Vue DevTools 的路由调试

### 3. 动态路由注册

```typescript
// 从数据库加载
const routes = await db.query('SELECT * FROM routes')
app.addRoutes(routes)

// 多租户
const tenantRoutes = await loadTenantRoutes(tenantId)
```

### 4. 权限系统集成

```typescript
{
  method: 'DELETE',
  path: '/users/:id',
  meta: {
    permissions: ['user:delete'],
    roles: ['admin'],
  }
}

generatePermissionMatrix(routes)  // 自动生成权限矩阵
```

### 5. 类型安全客户端

```typescript
// 服务端定义
const routes = [
  { name: 'getUser', path: '/users/:id', response: UserSchema }
]

// 自动生成类型安全客户端（类似 tRPC）
const user = await client.getUser({ id: '123' })
```

### 6. 路由分析与优化

- 路径冲突检测
- 未使用路由检测
- 性能瓶颈分析
- 自动测试生成

### 7. 版本管理与灰度

```typescript
{
  method: 'GET',
  path: '/users',
  handler: listUsersV2,
  meta: { version: 'v2' }
}
// 根据 Accept-Version header 路由
```

### 8. AI 驱动

```typescript
const routes = await ai.generateRoutes("创建用户管理模块 CRUD")
```

---

## 作为网关的优势

### 核心能力对比

| 能力 | Vafast | Kong | Nginx | Traefik |
|------|--------|------|-------|---------|
| 路由匹配 | Radix Tree O(k) | Radix Tree | 线性/正则 | Radix Tree |
| 配置方式 | 代码/声明式 | Admin API/DB | 配置文件 | 配置文件/标签 |
| 动态更新 | ✅ 热更新 | ✅ | ⚠️ reload | ✅ |
| 类型安全 | ✅ TypeScript | ❌ Lua | ❌ | ❌ Go |
| 中间件扩展 | 简单（JS函数） | 复杂（Lua插件） | 复杂（C模块） | 中等（Go插件） |

### 优势一：声明式路由聚合

```typescript
// 多服务路由聚合
const gatewayRoutes = [
  // 用户服务
  {
    path: '/api/users',
    meta: { upstream: 'user-service:3001' },
    children: await fetchServiceRoutes('user-service')
  },
  // 订单服务
  {
    path: '/api/orders',
    meta: { upstream: 'order-service:3002' },
    children: await fetchServiceRoutes('order-service')
  },
]

app.addRoutes(gatewayRoutes)
```

### 优势二：服务发现集成

```typescript
// 从 Consul/etcd/K8s 自动发现服务
const services = await consul.getServices()

const routes = services.map(service => ({
  path: `/api/${service.name}`,
  meta: {
    upstream: service.addresses,
    loadBalance: 'round-robin',
    healthCheck: '/health',
  },
  children: service.routes
}))
```

### 优势三：统一认证层

```typescript
const gatewayRoutes = [
  // 公开路由
  { method: 'POST', path: '/auth/login', handler: proxy('auth-service') },
  
  // 需要认证的路由
  {
    path: '/api',
    middleware: [
      jwtVerify(),           // 统一 JWT 验证
      rateLimiter(),         // 统一限流
      requestLogger(),       // 统一日志
    ],
    children: [
      { path: '/users', meta: { upstream: 'user-service' } },
      { path: '/orders', meta: { upstream: 'order-service' } },
    ]
  }
]
```

### 优势四：请求转换

```typescript
{
  method: 'GET',
  path: '/api/v2/users/:id',
  meta: {
    upstream: 'user-service',
    // 路径重写
    rewrite: '/api/v1/users/:id',
    // 请求头转换
    transformRequest: (req) => {
      req.headers.set('X-Gateway', 'vafast')
      return req
    },
    // 响应转换
    transformResponse: (res, data) => {
      return { ...data, gateway: 'vafast' }
    }
  }
}
```

### 优势五：熔断与重试

```typescript
{
  path: '/api/payments',
  meta: {
    upstream: 'payment-service',
    circuitBreaker: {
      threshold: 5,        // 5次失败触发熔断
      timeout: 30000,      // 30s 后尝试恢复
      fallback: () => ({ error: '支付服务暂不可用' })
    },
    retry: {
      attempts: 3,
      delay: 1000,
      conditions: [502, 503, 504]
    }
  }
}
```

### 优势六：灰度发布

```typescript
{
  method: 'GET',
  path: '/api/products',
  meta: {
    canary: {
      // 10% 流量到新版本
      weight: { 'v2': 10, 'v1': 90 },
      // 或按条件路由
      rules: [
        { header: 'X-Canary', value: 'true', upstream: 'product-v2' },
        { cookie: 'beta', value: '1', upstream: 'product-v2' },
      ]
    }
  }
}
```

### 优势七：可观测性

```typescript
// 自动为每个路由添加指标
{
  method: 'GET',
  path: '/api/users',
  meta: {
    metrics: {
      histogram: 'http_request_duration_seconds',
      labels: { service: 'user', endpoint: 'list' }
    },
    tracing: {
      serviceName: 'api-gateway',
      spanName: 'GET /api/users'
    }
  }
}

// 路由级别的监控面板
app.getMetrics()  // 按路由聚合的 QPS、延迟、错误率
```

### 优势八：配置热更新

```typescript
// 监听配置变更
configCenter.watch('gateway-routes', (newRoutes) => {
  app.updateRoutes(newRoutes)  // 无需重启
  console.log('路由已热更新')
})

// 或通过 Admin API
app.admin.post('/routes', (req) => {
  app.addRoutes(req.body.routes)
  return { success: true }
})
```

### 优势九：多协议支持

```typescript
const routes = [
  // HTTP API
  { method: 'GET', path: '/api/users', handler: proxy('user-service') },
  
  // WebSocket
  { 
    path: '/ws',
    meta: { protocol: 'websocket', upstream: 'ws-service' }
  },
  
  // gRPC 转 HTTP
  {
    method: 'POST',
    path: '/grpc/users.UserService/GetUser',
    meta: {
      protocol: 'grpc',
      upstream: 'user-service:50051',
      protoFile: './protos/user.proto'
    }
  }
]
```

### 优势十：TypeScript 全栈类型安全

```typescript
// 网关定义
const routes = [
  {
    name: 'getUser',
    method: 'GET',
    path: '/api/users/:id',
    params: z.object({ id: z.string() }),
    response: UserSchema,
  }
] as const

// 前端自动获得类型
import type { GatewayRoutes } from './gateway'
const client = createClient<GatewayRoutes>()
const user = await client.getUser({ id: '123' })
//    ^? User 类型自动推断
```

---

## 网关架构示意

```
┌─────────────────────────────────────────────────────────────┐
│                      Vafast Gateway                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   认证层    │  │   限流层    │  │   日志层    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│                    声明式路由表                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  /api/users  → user-service   (middleware: [auth])  │   │
│  │  /api/orders → order-service  (middleware: [auth])  │   │
│  │  /api/public → static-service                       │   │
│  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  负载均衡   │  │   熔断器    │  │   重试器    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
         │                │                │
         ▼                ▼                ▼
   ┌──────────┐    ┌──────────┐    ┌──────────┐
   │  User    │    │  Order   │    │  Static  │
   │ Service  │    │ Service  │    │ Service  │
   └──────────┘    └──────────┘    └──────────┘
```

---

## 总结

### 路由设计核心价值

**声明式路由 = 数据驱动**

- 可序列化、可传输
- 可分析、可验证
- 可生成、可转换
- 可测试、可文档化

### 网关核心优势

| 优势 | 说明 |
|------|------|
| **声明式配置** | 路由即数据，易于管理和版本控制 |
| **TypeScript** | 全栈类型安全，IDE 支持好 |
| **轻量高性能** | Radix Tree + 预编译，适合边缘部署 |
| **易扩展** | JS 函数即中间件，无需学习新语言 |
| **热更新** | 无需重启更新路由配置 |
| **现代生态** | 与 Bun/Deno/Edge 完美集成 |

### 适用场景

- BFF (Backend for Frontend)
- API 聚合网关
- 微服务入口网关
- 边缘计算网关
- 多租户 SaaS 平台

