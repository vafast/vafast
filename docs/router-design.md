# Vafast 路由设计与网关架构

## 目录

1. [路由设计哲学](#路由设计哲学)
2. [链式 vs 声明式对比](#链式-vs-声明式对比)
3. [声明式路由的战略优势](#声明式路由的战略优势)
4. [路由组实现方案](#路由组实现方案)
5. [声明式路由的想象力](#声明式路由的想象力)
6. [AI 时代的路由能力](#ai-时代的路由能力)
7. [作为网关的优势](#作为网关的优势)

### 相关文档

- [本地工具模式](./local-tools-mode.md) - 声明式路由作为本地 AI 工具，无需 HTTP 服务

---

## 路由设计哲学

### 核心原则

Vafast 路由采用 **Vue Router 风格**的声明式设计：

```typescript
import { defineRoute, defineRoutes } from 'vafast';

const routes = defineRoutes([
  defineRoute({ method: 'GET', path: '/', handler: home }),
  defineRoute({ method: 'GET', path: '/users', handler: listUsers }),
  defineRoute({ method: 'GET', path: '/users/:id', handler: getUser }),
  defineRoute({
    path: '/api',
    middleware: [cors()],
    children: [
      defineRoute({ method: 'GET', path: '/health', handler: healthCheck }),
      defineRoute({
        path: '/v1',
        middleware: [rateLimit()],
        children: [
          defineRoute({ method: 'GET', path: '/posts', handler: listPosts }),
        ]
      })
    ]
  })
])
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
import { defineRoute, defineRoutes } from 'vafast';

const routes = defineRoutes([
  defineRoute({ method: 'GET', path: '/users', handler: listUsers }),
  defineRoute({ method: 'POST', path: '/users', handler: createUser }),
  defineRoute({
    path: '/api/v1',
    middleware: [auth],
    children: [
      defineRoute({ method: 'GET', path: '/posts', handler: listPosts }),
    ]
  })
])

const server = new Server(routes)
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
import { defineRoute, defineRoutes } from 'vafast';

// 声明式定义（可测试、可序列化）
const userRoutes = defineRoutes([
  defineRoute({ method: 'GET', path: '/users', handler: listUsers }),
])

// 创建服务器
const server = new Server(userRoutes)
server.useGlobalMiddleware(cors())
```

---

## 声明式路由的战略优势

> **核心洞察**：网关/平台场景下，声明式优势碾压链式。
>
> 原因：网关本质是**配置驱动**，而非**代码驱动**。

### 为什么网关必须声明式

#### 1. 配置来源多样化

```typescript
// 链式 ❌ - 只能写死在代码里
app.get('/users', proxy('user-service'))

// 声明式 ✅ - 配置可以从任何地方来
const routes = await Promise.any([
  fetchFromConfigCenter(),       // 配置中心 (Apollo/Nacos)
  fetchFromConsul(),             // 服务发现
  fetchFromDB(),                 // 数据库
  loadFromYAML('./routes.yaml'), // 配置文件
])
app.addRoutes(routes)
```

#### 2. 运行时动态更新

```typescript
// 链式 ❌ - 无法运行时修改，必须重启服务

// 声明式 ✅ - 热更新，秒级生效，零停机
configCenter.watch('routes', (newRoutes) => {
  app.updateRoutes(newRoutes)
})
```

#### 3. 多环境配置

```typescript
// 链式 ❌ - 条件判断散落各处
if (env === 'prod') app.get('/users', proxy('prod-service'))
else app.get('/users', proxy('dev-service'))

// 声明式 ✅ - 整套配置替换
const routes = loadRoutes(`./routes.${env}.json`)
app.addRoutes(routes)
```

#### 4. 版本控制与审计

```typescript
// 链式 ❌ - 路由变更混在业务代码里，diff 难以审计

// 声明式 ✅ - 配置即版本
// routes.v1.json → routes.v2.json
// Git diff 一目了然，可以 code review
// 支持回滚到任意历史版本
```

#### 5. 可视化管理后台

```typescript
// 链式 ❌ - 无法可视化管理

// 声明式 ✅ - 天然支持 Admin UI
app.admin.get('/routes', () => app.getRoutes())           // 查看所有路由
app.admin.post('/routes', (req) => app.addRoute(req.body))    // 新增路由
app.admin.put('/routes/:id', (req) => app.updateRoute(...))   // 修改路由
app.admin.delete('/routes/:id', (req) => app.removeRoute(...)) // 删除路由

// 可以构建：
// - 路由拓扑可视化
// - 流量监控大盘
// - 拖拽式路由编辑器
```

#### 6. 静态分析能力

```typescript
// 链式 ❌ - 需要运行才知道有哪些路由

// 声明式 ✅ - 构建时静态分析
analyzeRoutes(routes)
// - 检测冲突路由：/users/:id vs /users/new
// - 检测循环依赖
// - 生成路由拓扑图
// - 自动生成 API 文档
// - 未使用路由检测
```

#### 7. 多集群配置同步

```typescript
// 链式 ❌ - 每个实例独立配置，难以保证一致性

// 声明式 ✅ - 中心化配置分发
// 配置中心 (单一数据源)
//    ↓ 推送
// 所有网关实例同步更新
// 保证集群配置一致性
```

#### 8. 跨语言/跨平台共享

```typescript
// 链式 ❌ - JavaScript 专属

// 声明式 ✅ - 路由配置可跨语言共享
const routeConfig = JSON.stringify(routes)

// 同一份配置可用于：
// - Node.js 网关
// - Go sidecar
// - Python 测试工具
// - Rust 边缘节点
```

### 场景适用性对比

| 场景 | 链式 | 声明式 | 说明 |
|------|------|--------|------|
| 个人项目 | ✅ 优 | ⚠️ 可 | 链式写起来爽 |
| 小团队 API | ✅ 优 | ✅ 优 | 都可以 |
| 企业级 API | ⚠️ 可 | ✅ 优 | 需要审计、版本控制 |
| **API 网关** | ❌ 差 | ✅ 必须 | 配置驱动是刚需 |
| **微服务平台** | ❌ 差 | ✅ 必须 | 动态路由、服务发现 |
| **多租户 SaaS** | ❌ 差 | ✅ 必须 | 租户级路由隔离 |
| **边缘计算** | ⚠️ 可 | ✅ 优 | 配置下发、热更新 |

### 声明式的未来前景

```
┌─────────────────────────────────────────────────────────────┐
│                    声明式路由演进路线                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  阶段 1: 静态配置                                           │
│  routes.json → app.addRoutes()                              │
│                                                             │
│  阶段 2: 动态配置                                           │
│  配置中心 → 热更新 → 零停机发布                              │
│                                                             │
│  阶段 3: 智能路由                                           │
│  服务发现 + 健康检查 + 自动摘除故障节点                       │
│                                                             │
│  阶段 4: 自适应路由                                          │
│  基于 QPS/延迟/错误率 自动调整流量权重                        │
│                                                             │
│  阶段 5: AI 驱动路由                                         │
│  - 自然语言生成路由配置                                      │
│  - 智能流量预测与预热                                        │
│  - 异常检测与自动熔断                                        │
│  - 路由优化建议                                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 核心结论

| 维度 | 链式 | 声明式 |
|------|------|--------|
| **本质** | 代码即配置 | 数据即配置 |
| **灵活性** | 运行时灵活 | 配置时灵活 |
| **可管理性** | 低 | 高 |
| **可扩展性** | 受限于代码 | 配置无限扩展 |
| **适用规模** | 小型项目 | 任意规模 |
| **未来趋势** | 维持现状 | 持续增长 |

> **一句话总结**：
>
> 链式是**开发者友好**的 API 设计。
>
> 声明式是**平台友好**的架构设计。
>
> Vafast 的定位是**网关/平台**，因此声明式是核心，链式是补充。

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
import { defineRoute, defineRoutes, Type } from 'vafast';

const CreateUserSchema = Type.Object({
  name: Type.String(),
  email: Type.String()
});

const routes = defineRoutes([
  defineRoute({
    method: 'POST',
    path: '/users',
    schema: { body: CreateUserSchema },
    handler: createUser,
    name: '创建用户',
    description: '创建新用户',
  })
])

const server = new Server(routes)
// 使用 getApiSpec() 自动生成 Swagger
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

## AI 时代的路由能力

### 核心问题：AI 能理解什么？

**AI 能理解数据（JSON），不能理解代码逻辑。**

```typescript
// 链式 = 代码
app.get('/users', handler)
app.post('/users', handler)

// AI 看到的：一堆函数调用，不知道有哪些路由，不知道执行顺序
```

```typescript
// 声明式 = 数据
const routes = [
  { method: 'GET', path: '/users' },
  { method: 'POST', path: '/users' },
]

// AI 看到的：一个数组，清楚知道有 2 个路由，结构一目了然
```

### 为什么 AI 能处理声明式？

| | 链式 | 声明式 |
|--|------|--------|
| 本质 | **代码**（过程式） | **数据**（结构化） |
| AI 能读懂？ | ❌ 不能 | ✅ 能 |
| AI 能生成？ | ❌ 困难 | ✅ 容易 |
| AI 能分析？ | ❌ 不能 | ✅ 能 |
| AI 能修改？ | ❌ 风险高 | ✅ 安全 |

**类比**：
- Excel 表格 → AI 能分析 ✅
- 手写计算草稿 → AI 看不懂 ❌

路由也一样：
- JSON 配置 → AI 能处理 ✅  
- 代码调用链 → AI 理解困难 ❌

> **一句话**：声明式让路由变成「AI 能操作的数据」。

---

### 实际场景示例

#### 场景 1：让 AI 检查路由完整性

**链式**（AI 做不到）：
```
你：帮我检查有没有漏掉的接口
AI：我看不懂你的代码逻辑，无法分析...
```

**声明式**（AI 能做）：
```typescript
const routes = [
  { method: 'GET', path: '/users' },
  { method: 'POST', path: '/users' },
  { method: 'GET', path: '/users/:id' },
]

// AI 分析后回答：
// "你有查询列表、创建、查询详情，但缺少 PUT（更新）和 DELETE（删除）"
```

#### 场景 2：让 AI 调用接口

**没有声明式路由**：
```
用户：帮我查一下订单 123 的状态
AI：我不知道你的系统有哪些接口，无法帮你调用...
```

**有声明式路由**：
```typescript
const routes = [
  { method: 'GET', path: '/orders/:id', meta: { description: '查询订单详情' } },
]

// AI 读取路由表后：
用户：帮我查一下订单 123 的状态
AI：好的，我调用 GET /orders/123 
    → 返回结果：订单状态为「已发货」
```

#### 场景 3：让 AI 生成文档

**链式**：需要运行代码、解析 AST，非常复杂

**声明式**：直接读取数据
```typescript
const routes = [
  { 
    method: 'POST', 
    path: '/users',
    body: { name: 'string', email: 'string' },
    meta: { description: '创建用户' }
  },
]

// AI 直接生成文档：
// ## 创建用户
// POST /users
// 
// 请求体：
// - name: string (必填)
// - email: string (必填)
```

---

### AI 能力详解

以下是声明式路由在 AI 时代解锁的具体能力：

#### 1. 自然语言生成路由

```typescript
// 用户输入
"创建一个电商 API，包含商品、订单、支付模块"

// AI 输出
const routes = [
  // 商品模块
  { method: 'GET', path: '/products', handler: 'listProducts', meta: { tags: ['商品'] } },
  { method: 'GET', path: '/products/:id', handler: 'getProduct' },
  { method: 'POST', path: '/products', handler: 'createProduct', meta: { roles: ['admin'] } },
  
  // 订单模块
  { method: 'GET', path: '/orders', handler: 'listOrders' },
  { method: 'POST', path: '/orders', handler: 'createOrder', body: 'CreateOrderSchema' },
  
  // 支付模块
  { method: 'POST', path: '/payments', handler: 'createPayment' },
  { method: 'POST', path: '/payments/:id/refund', handler: 'refundPayment' },
]

// 甚至可以迭代优化
"给订单添加分页和状态筛选"
// AI 自动更新路由配置
```

### 2. 自然语言调用 API

```typescript
// 传统方式
const user = await fetch('/api/users/123')

// AI 时代
const user = await ai.call("获取 ID 为 123 的用户信息")
// AI 分析路由表，找到匹配的 endpoint，自动调用

// 更复杂的查询
const result = await ai.call("找出最近一周下单超过3次的用户")
// AI 可能会：
// 1. 调用 /api/orders?since=7d
// 2. 聚合统计
// 3. 调用 /api/users?ids=xxx
// 4. 返回结果
```

### 3. 智能路由推荐

```typescript
// AI 分析现有路由，给出优化建议
const analysis = await ai.analyzeRoutes(routes)

// 输出：
{
  suggestions: [
    {
      type: 'missing_endpoint',
      message: '检测到有 POST /users 但没有 DELETE /users/:id，建议添加删除接口',
      fix: { method: 'DELETE', path: '/users/:id', handler: 'deleteUser' }
    },
    {
      type: 'inconsistent_naming',
      message: '/api/v1/get-users 不符合 RESTful 规范，建议改为 /api/v1/users',
      fix: { path: '/api/v1/users' }
    },
    {
      type: 'security_risk',
      message: 'DELETE /users/:id 没有鉴权中间件，建议添加',
      fix: { middleware: ['auth', 'adminOnly'] }
    },
    {
      type: 'performance',
      message: '/api/reports/heavy 响应时间长，建议添加缓存或异步处理',
    }
  ]
}
```

### 4. 自动 Schema 推断

```typescript
// 给 AI 一些示例请求
const examples = [
  { method: 'POST', path: '/users', body: { name: '张三', email: 'test@example.com', age: 25 } },
  { method: 'POST', path: '/users', body: { name: '李四', email: 'li@example.com' } },
]

// AI 自动推断 Schema
const schema = await ai.inferSchema(examples)
// 输出：
{
  body: z.object({
    name: z.string(),
    email: z.string().email(),
    age: z.number().optional(),
  })
}
```

### 5. 异常检测与自愈

```typescript
// AI 监控路由运行时指标
ai.monitor(app, {
  onAnomaly: async (anomaly) => {
    // 检测到异常
    if (anomaly.type === 'latency_spike') {
      // 自动触发熔断
      await app.updateRoute(anomaly.route, {
        meta: { circuitBreaker: { enabled: true } }
      })
      
      // 通知运维
      await notify(`路由 ${anomaly.route} 延迟异常，已自动熔断`)
    }
    
    if (anomaly.type === 'error_rate_high') {
      // 自动切换到备用服务
      await app.updateRoute(anomaly.route, {
        meta: { upstream: 'backup-service' }
      })
    }
  }
})
```

### 6. 智能流量调度

```typescript
// AI 根据实时数据自动调整流量
ai.autoScale(app, {
  // 基于预测的流量预热
  predictTraffic: true,  // 预测明天大促，提前扩容
  
  // 基于成本的路由优化
  costOptimize: true,    // 低峰期路由到便宜的节点
  
  // 基于延迟的智能路由
  latencyOptimize: true, // 自动选择延迟最低的上游
  
  // 基于用户的个性化路由
  userSegment: true,     // VIP 用户路由到专属服务
})
```

### 7. API 文档智能问答

```typescript
// 基于路由配置的智能文档
const docs = ai.generateDocs(routes)

// 用户可以直接问问题
await docs.ask("如何创建订单？")
// AI 回答：
// "使用 POST /api/orders，请求体需要包含 productId 和 quantity..."
// 并给出代码示例

await docs.ask("用户鉴权是怎么做的？")
// AI 分析中间件配置，解释鉴权流程
```

### 8. 测试用例自动生成

```typescript
// AI 根据路由和 Schema 自动生成测试
const tests = await ai.generateTests(routes)

// 输出：
[
  {
    name: 'POST /users - 正常创建',
    request: { method: 'POST', path: '/users', body: { name: '测试', email: 'test@test.com' } },
    expect: { status: 201 }
  },
  {
    name: 'POST /users - 邮箱格式错误',
    request: { method: 'POST', path: '/users', body: { name: '测试', email: 'invalid' } },
    expect: { status: 400, body: { error: 'email 格式不正确' } }
  },
  {
    name: 'POST /users - 缺少必填字段',
    request: { method: 'POST', path: '/users', body: {} },
    expect: { status: 400 }
  },
  {
    name: 'GET /users/:id - 不存在的用户',
    request: { method: 'GET', path: '/users/999999' },
    expect: { status: 404 }
  },
  // ... 边界条件、安全测试等
]
```

### 9. 多 Agent 协作

```typescript
// 不同 AI Agent 通过路由协作
const agentRoutes = [
  {
    path: '/agents/analyst',
    meta: { 
      agent: 'data-analyst',
      capabilities: ['数据分析', '报表生成', 'SQL查询']
    }
  },
  {
    path: '/agents/writer',
    meta: {
      agent: 'content-writer', 
      capabilities: ['文案撰写', '翻译', '摘要']
    }
  },
  {
    path: '/agents/coder',
    meta: {
      agent: 'code-assistant',
      capabilities: ['代码生成', '代码审查', 'Bug修复']
    }
  }
]

// 主 Agent 根据任务自动路由到合适的子 Agent
await masterAgent.process("分析上周销售数据并生成报告")
// 自动调用 /agents/analyst
```

### 10. 语义化 API

```typescript
// 传统 REST
GET /users/123/orders?status=pending&limit=10

// 语义化 API（AI 时代）
const routes = [
  {
    path: '/query',
    method: 'POST',
    meta: { semantic: true },
    handler: async (req) => {
      const { question } = req.body
      // "获取用户123的待处理订单，最多10条"
      
      // AI 解析意图，转换为实际查询
      const intent = await ai.parseIntent(question)
      // { entity: 'orders', filters: { userId: 123, status: 'pending' }, limit: 10 }
      
      return executeQuery(intent)
    }
  }
]
```

### 11. 版本迁移助手

```typescript
// AI 辅助 API 版本迁移
const migration = await ai.planMigration({
  from: routesV1,
  to: routesV2,
})

// 输出：
{
  breakingChanges: [
    { path: '/users', change: 'response 格式变化', impact: 'high' },
  ],
  migrationGuide: `
    1. /users 返回格式从 { data: [...] } 改为 { users: [...], total: n }
    2. 建议客户端先检查 response.users，兼容两种格式
    3. 预计影响 15 个调用方
  `,
  compatibilityLayer: {
    // AI 自动生成兼容层代码
    middleware: '...'
  }
}
```

### 12. 安全审计

```typescript
// AI 安全审计
const securityReport = await ai.securityAudit(routes)

// 输出：
{
  vulnerabilities: [
    {
      severity: 'critical',
      route: 'GET /users/:id',
      issue: '可能存在 IDOR 漏洞，未验证用户只能访问自己的数据',
      fix: '添加 ownership 检查中间件'
    },
    {
      severity: 'medium', 
      route: 'POST /upload',
      issue: '文件上传未限制类型和大小',
      fix: '添加文件类型白名单和大小限制'
    }
  ],
  compliance: {
    gdpr: { pass: false, issues: ['缺少数据导出接口', '缺少删除接口'] },
    pci: { pass: true }
  }
}
```

---

### 声明式路由作为 AI Tools

声明式路由可以直接转换为 AI Tools（如 OpenAI Function Calling、Claude Tool Use），实现 **一份配置，多种用途**。

#### 路由 → Tools 自动映射

```typescript
// 你的路由配置
const routes = [
  {
    name: 'getUser',
    method: 'GET',
    path: '/users/:id',
    params: z.object({ id: z.string() }),
    response: z.object({ name: z.string(), email: z.string() }),
    meta: { description: '根据 ID 获取用户信息' }
  },
  {
    name: 'createOrder',
    method: 'POST',
    path: '/orders',
    body: z.object({
      productId: z.string(),
      quantity: z.number(),
    }),
    meta: { description: '创建新订单' }
  }
]

// 一行代码自动转换为 OpenAI Tools 格式
const tools = routesToTools(routes)

// 输出：
[
  {
    type: 'function',
    function: {
      name: 'getUser',
      description: '根据 ID 获取用户信息',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'createOrder',
      description: '创建新订单',
      parameters: {
        type: 'object',
        properties: {
          productId: { type: 'string' },
          quantity: { type: 'number' }
        },
        required: ['productId', 'quantity']
      }
    }
  }
]
```

**链式路由做不到**：没有结构化数据，无法自动转换。

#### AI Tools 核心优势

##### 1. 零成本生成 Tools 定义

```typescript
// 一行代码，不需要手动维护两份配置
const tools = routesToTools(routes)

// 路由改了，Tools 自动同步
```

##### 2. Schema 复用

```typescript
// 定义一次
const CreateOrderSchema = z.object({
  productId: z.string(),
  quantity: z.number().min(1),
})

// 用于 HTTP API 校验
{ method: 'POST', path: '/orders', body: CreateOrderSchema }

// 同时用于 AI Tools 参数定义
// AI 调用时也会遵循同样的校验规则
```

##### 3. 权限自动继承

```typescript
const routes = [
  {
    name: 'deleteUser',
    method: 'DELETE',
    path: '/users/:id',
    meta: { 
      roles: ['admin'],  // 只有管理员能调用
      description: '删除用户'
    }
  }
]

// AI 调用前自动检查权限
async function executeAITool(toolName, args, user) {
  const route = routes.find(r => r.name === toolName)
  
  // 权限检查（自动继承路由配置）
  if (route.meta.roles && !route.meta.roles.includes(user.role)) {
    return { error: '无权限执行此操作' }
  }
  
  return await callAPI(route, args)
}
```

##### 4. 限流/计费/确认控制

```typescript
const routes = [
  {
    name: 'generateReport',
    method: 'POST',
    path: '/reports/generate',
    meta: {
      aiCost: 'high',        // 标记为高消耗操作
      rateLimit: 10,         // 每分钟最多 10 次
      requireConfirm: true,  // AI 调用前需要用户确认
    }
  }
]

// AI 执行前自动检查
if (route.meta.requireConfirm) {
  await confirmWithUser('这是一个耗时操作，确认执行？')
}
if (route.meta.rateLimit) {
  await checkRateLimit(user, route.name, route.meta.rateLimit)
}
```

##### 5. 智能工具发现

```typescript
// AI Agent 可以动态发现可用工具
const availableTools = routes
  .filter(r => r.meta.aiEnabled !== false)  // 过滤掉禁用的
  .filter(r => userHasPermission(user, r))  // 过滤掉没权限的
  .map(routeToTool)

// 告诉 AI："你有这些工具可以用"
const response = await ai.chat({
  messages: [...],
  tools: availableTools,  // 动态工具列表，按用户权限过滤
})
```

##### 6. 上下文感知

```typescript
const routes = [
  {
    name: 'getOrderStatus',
    path: '/orders/:id/status',
    meta: {
      description: '查询订单状态',
      examples: [
        { input: { id: 'ORD-123' }, output: { status: 'shipped' } }
      ],
      useCases: ['用户询问订单进度', '物流查询'],
    }
  }
]

// AI 可以根据 useCases 判断什么时候用这个工具
// examples 帮助 AI 理解输入输出格式
```

##### 7. 统一调用链追踪

```typescript
// 因为所有 AI 调用都经过路由，可以统一追踪和记录
const aiCallLog = {
  sessionId: 'session-xxx',
  user: 'user-123',
  calls: [
    { tool: 'getUser', args: { id: '123' }, result: {...}, latency: 50 },
    { tool: 'createOrder', args: {...}, result: {...}, latency: 120 },
  ],
  totalCost: 0.02,
}

// 方便调试、审计、计费
```

##### 8. 一套系统，多种接入

```
              声明式路由配置
                    │
       ┌────────────┼────────────┐
       ▼            ▼            ▼
    HTTP API    AI Tools     CLI 命令
       │            │            │
    前端调用    AI Agent     终端脚本
```

```typescript
// 同一份路由配置
const routes = [...]

// 生成 HTTP API
app.addRoutes(routes)

// 生成 AI Tools
const tools = routesToTools(routes)

// 甚至可以生成 CLI
const commands = routesToCLI(routes)
// $ vafast user get --id 123
// $ vafast order create --productId xxx --quantity 2
```

#### 完整示例：电商 AI 助手

```typescript
// routes.ts - 单一数据源
export const routes = [
  {
    name: 'searchProducts',
    method: 'GET',
    path: '/products',
    query: z.object({
      keyword: z.string().optional(),
      category: z.string().optional(),
      minPrice: z.number().optional(),
      maxPrice: z.number().optional(),
    }),
    response: z.array(ProductSchema),
    meta: {
      description: '搜索商品',
      aiEnabled: true,
      examples: [
        { 
          userSays: '找一下 100 块以下的手机壳',
          args: { category: '手机壳', maxPrice: 100 }
        }
      ]
    }
  },
  {
    name: 'createOrder',
    method: 'POST',
    path: '/orders',
    body: z.object({
      productId: z.string(),
      quantity: z.number(),
    }),
    meta: {
      description: '创建订单',
      aiEnabled: true,
      requireConfirm: true,  // 下单前需要用户确认
    }
  }
]

// server.ts - HTTP API
app.addRoutes(routes)

// ai-agent.ts - AI 电商助手
const tools = routes
  .filter(r => r.meta.aiEnabled)
  .map(routeToTool)

// 用户对话
const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [
    { role: 'user', content: '帮我找 100 块以下的手机壳，然后买一个' }
  ],
  tools: tools,
})

// AI 会：
// 1. 调用 searchProducts({ category: '手机壳', maxPrice: 100 })
// 2. 展示结果给用户
// 3. 用户选择后，调用 createOrder({ productId: 'xxx', quantity: 1 })
// 4. 因为 requireConfirm: true，会先询问用户确认
```

#### AI Tools 对比总结

| 能力 | 手写 Tools 定义 | 声明式路由生成 |
|------|----------------|---------------|
| 维护成本 | 高（两份配置） | 低（一份配置） |
| 配置同步 | 容易不一致 | 自动同步 |
| Schema 复用 | ❌ | ✅ |
| 权限继承 | 需要重复写 | 自动继承 |
| 限流/计费 | 需要额外开发 | 配置即生效 |
| 调用追踪 | 需要额外开发 | 统一入口 |
| 动态工具 | 困难 | 简单过滤 |
| 多端复用 | ❌ | ✅ HTTP/AI/CLI |

> **一句话**：声明式路由让 API 成为 AI 的「原生工具」，零适配成本。

> 📖 **延伸阅读**：[本地工具模式](./local-tools-mode.md) - 不启动 HTTP 服务，直接本地调用，适用于桌面 AI 助手、Electron 应用等场景。

---

### AI 时代路由能力总结

| 能力 | 描述 | 链式支持 | 声明式支持 |
|------|------|----------|------------|
| 自然语言生成 | 用自然语言描述生成路由 | ❌ | ✅ |
| 自然语言调用 | 用自然语言调用 API | ❌ | ✅ |
| **AI Tools 转换** | 路由自动转为 AI 工具定义 | ❌ | ✅ |
| 智能推荐 | AI 分析路由给出优化建议 | ❌ | ✅ |
| Schema 推断 | 从示例推断数据结构 | ❌ | ✅ |
| 异常自愈 | 检测异常自动处理 | ⚠️ 部分 | ✅ |
| 智能调度 | 基于数据的流量调度 | ⚠️ 部分 | ✅ |
| 文档问答 | 基于路由的智能问答 | ❌ | ✅ |
| 测试生成 | 自动生成测试用例 | ❌ | ✅ |
| Agent 协作 | 多 AI Agent 路由协作 | ❌ | ✅ |
| 语义化 API | 自然语言查询接口 | ❌ | ✅ |
| 迁移助手 | AI 辅助版本迁移 | ❌ | ✅ |
| 安全审计 | AI 安全漏洞检测 | ❌ | ✅ |

> **核心洞察**：
>
> AI 需要**结构化数据**才能理解和操作。
>
> 声明式路由 = 结构化数据 = AI 原生。
>
> 链式路由 = 过程式代码 = AI 难以处理。

---

### 链式能实现这些吗？

理论上链式也能获取路由信息，但会遇到很多问题：

#### 问题 1：必须执行代码才能获取路由

```typescript
// 声明式 - 静态数据，不需要执行
const routes = [
  { method: 'GET', path: '/users', handler: listUsers }
]
// 构建时、CI/CD 时都能直接读取分析

// 链式 - 必须执行才能获取
const app = vafast().get('/users', listUsers)
const routes = app.getRoutes()  // 需要运行这段代码
// 无法静态分析，CI/CD 工具难以检查
```

#### 问题 2：描述信息无处安放

```typescript
// 声明式 - 描述是数据的一部分
{
  name: 'getUser',
  path: '/users/:id',
  meta: { 
    description: '获取用户信息',
    aiEnabled: true
  }
}

// 链式 - 描述写在哪？
app.get('/users/:id', getUser)  // 没地方写 description

// 硬要支持就变成这样...
app.get('/users/:id', getUser, { 
  name: 'getUser',
  description: '获取用户信息',
})
// 第三个参数越来越像声明式了
```

#### 问题 3：Schema 无法关联

```typescript
// 声明式 - Schema 和路由天然在一起
{
  method: 'POST',
  path: '/orders',
  body: z.object({ productId: z.string() }),
  handler: createOrder
}

// 链式 - Schema 藏在 handler 内部
app.post('/orders', (req) => {
  const body = OrderSchema.parse(req.body)  // Schema 在函数里
  // 外部无法获取 Schema 信息
})

// 要暴露 Schema 又变成这样
app.post('/orders', createOrder, { body: OrderSchema })
// 本质上还是在写声明式
```

#### 问题 4：本地执行不自然

```typescript
// 声明式 - handler 可以是纯函数
const routes = [
  {
    name: 'calculate',
    params: z.object({ a: z.number(), b: z.number() }),
    handler: ({ a, b }) => a + b  // 纯函数，直接调用
  }
]
const result = execute('calculate', { a: 1, b: 2 })  // 简单

// 链式 - handler 依赖 Request 对象
app.get('/calculate', (req) => {
  const { a, b } = req.query      // 依赖 Request
  return Response.json(a + b)     // 返回 Response
})
// 本地调用需要构造假的 Request，很别扭
const fakeReq = new Request('http://x/calculate?a=1&b=2')
const res = await handler(fakeReq)
const result = await res.json()
```

#### 问题 5：无法序列化

```typescript
// 声明式 - 可以存储、传输、版本控制
const routes = [{ method: 'GET', path: '/users', description: '...' }]
await saveToConfigCenter(JSON.stringify(routes))  // ✅

// 链式 - 包含函数，无法序列化
const app = vafast().get('/users', listUsers)
JSON.stringify(app.getRoutes())  // ❌ 函数无法 JSON 化
// 无法存到配置中心、无法热更新
```

#### 问题 6：动态加载困难

```typescript
// 声明式 - 从任何地方加载
const routes = await fetch('/api/routes').then(r => r.json())
app.addRoutes(routes)  // ✅

// 链式 - 代码必须提前写好
// 无法从配置中心加载
// 无法运行时动态添加
```

#### 对比总结

| 能力 | 声明式 | 链式 |
|------|--------|------|
| 静态分析 | ✅ 直接读取 | ❌ 需执行代码 |
| 描述/元数据 | ✅ 数据字段 | ⚠️ 额外参数 |
| Schema 关联 | ✅ 天然一体 | ⚠️ 需要额外传 |
| 本地执行 | ✅ 纯函数 | ❌ 依赖 Request |
| 序列化 | ✅ JSON | ❌ 含函数 |
| 动态加载 | ✅ 配置中心 | ❌ 代码固定 |
| 热更新 | ✅ 替换数据 | ❌ 需重启 |

#### 结论

> 链式硬要实现 AI 功能，会越改越像声明式。
>
> 与其用链式模拟声明式，不如直接用声明式。
>
> **链式适合写代码，声明式适合做平台。**

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

