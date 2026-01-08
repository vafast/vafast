# 嵌套路由和中间件继承

这个示例展示了 Vafast 框架的嵌套路由功能，支持路由分组和中间件继承。

## 特性

- **路由分组**: 将相关路由组织在一起，提高代码可读性
- **中间件继承**: 子路由自动继承父路由的中间件
- **路径拼接**: 自动拼接父路由和子路由的路径
- **中间件链**: 支持复杂的中间件组合

## 中间件执行顺序详解

### 🎯 核心原理

中间件执行遵循 **洋葱模型（Onion Model）**，就像剥洋葱一样：
1. **进入阶段**: 从外到内，依次执行每个中间件的前置逻辑
2. **处理阶段**: 执行最终的处理器函数
3. **离开阶段**: 从内到外，依次执行每个中间件的后置逻辑

### 📊 执行顺序示例

以路由 `/demo/level1/level2/final` 为例：

```
🔄 [1] 进入中间件: 全局中间件1
🔄 [2] 进入中间件: 全局中间件2
🔄 [3] 进入中间件: 一级中间件1
🔄 [4] 进入中间件: 一级中间件2
🔄 [5] 进入中间件: 二级中间件1
🔄 [6] 进入中间件: 二级中间件2
🔄 [7] 进入中间件: 最终中间件1
🔄 [8] 进入中间件: 最终中间件2
🎯 执行处理器函数
✅ [8] 离开中间件: 最终中间件2
✅ [7] 离开中间件: 最终中间件1
✅ [6] 离开中间件: 二级中间件2
✅ [5] 离开中间件: 二级中间件1
✅ [4] 离开中间件: 一级中间件2
✅ [3] 离开中间件: 一级中间件1
✅ [2] 离开中间件: 全局中间件2
✅ [1] 离开中间件: 全局中间件1
```

### 🔄 执行流程

```
请求 → 中间件1 → 中间件2 → ... → 处理器 → ... → 中间件2 → 中间件1 → 响应
```

1. **请求进入**: 从第一个中间件开始
2. **层层深入**: 每个中间件调用 `next()` 进入下一层
3. **到达核心**: 执行处理器函数
4. **层层返回**: 从最内层开始，依次返回到最外层
5. **响应返回**: 最终响应返回给客户端

### 🏗️ 中间件链构建规则

#### 1. 扁平化过程
```typescript
// 嵌套路由
{
  path: "/admin",
  middleware: [auth, rateLimit],
  children: [
    {
      path: "/dashboard",
      middleware: [audit],
      handler: dashboardHandler
    }
  ]
}

// 扁平化后
{
  path: "/admin/dashboard",
  middlewareChain: [auth, rateLimit, audit],
  handler: dashboardHandler
}
```

#### 2. 执行顺序
```typescript
// 中间件链: [auth, rateLimit, audit]
// 执行顺序:
auth → rateLimit → audit → handler → audit → rateLimit → auth
```

### 📝 实际应用示例

#### 管理员路由组
```typescript
{
  path: "/admin",
  middleware: [
    requireAuth({ role: 'admin' }),     // 1. 身份验证
    rateLimit({ max: 100, window: '1m' }) // 2. 限流
  ],
  children: [
    {
      path: "/dashboard",
      method: "GET",
      handler: dashboardHandler,
      middleware: [auditLog()]          // 3. 审计日志
    }
  ]
}
```

**执行顺序**:
```
进入: requireAuth → rateLimit → auditLog → handler
离开: handler → auditLog → rateLimit → requireAuth
```

#### API 版本管理
```typescript
{
  path: "/api",
  middleware: [cors, jsonParser],       // 1-2. 基础中间件
  children: [
    {
      path: "/v1",
      middleware: [
        versionCheck('v1'),             // 3. 版本检查
        rateLimit({ max: 1000 })        // 4. 限流
      ],
      children: [
        {
          path: "/users",
          method: "GET",
          handler: getUsersHandler,
          middleware: [cache({ ttl: '5m' })] // 5. 缓存
        }
      ]
    }
  ]
}
```

**执行顺序**:
```
进入: cors → jsonParser → versionCheck → rateLimit → cache → handler
离开: handler → cache → rateLimit → versionCheck → jsonParser → cors
```

### ⚠️ 注意事项

1. **中间件顺序**: 父路由中间件先执行，子路由中间件后执行
2. **错误处理**: 如果中间件抛出错误，后续中间件不会执行
3. **异步处理**: 所有中间件都支持异步操作
4. **性能**: 中间件在启动时扁平化，运行时性能不受影响

### 🧪 测试中间件顺序

运行示例查看详细的中间件执行过程：

```bash
npm run example/advanced/middleware-order.ts
```

## 路由结构

```typescript
const routes: NestedRoute[] = [
  {
    path: "/admin", // 父路由，只是分组
    middleware: [
      requireAuth({ role: 'admin' }),
      rateLimit({ max: 100, window: '1m' })
    ],
    children: [
      {
        path: "/dashboard", // 实际路径: /admin/dashboard
        method: "GET",
        handler: adminDashboardHandler,
        middleware: [auditLog()] // 额外添加的中间件
      },
      {
        path: "/users", // 实际路径: /admin/users
        method: "GET",
        handler: getUsersHandler,
        // 继承父路由的中间件：requireAuth + rateLimit
      }
    ]
  }
];
```

## 中间件继承规则

1. **父路由中间件**: 所有子路由都会继承
2. **子路由中间件**: 在父路由中间件之后执行
3. **执行顺序**: 父中间件 → 子中间件 → 处理器

### 示例：/admin/dashboard 的中间件链

```
requireAuth({ role: 'admin' }) → rateLimit({ max: 100, window: '1m' }) → auditLog() → handler
```

### 示例：/api/v1/users 的中间件链

```
cors() → jsonParser() → errorHandler() → versionCheck('v1') → rateLimit({ max: 1000, window: '1m' }) → cache({ ttl: '5m' }) → handler
```

## 路径拼接规则

- 父路由路径 + 子路由路径 = 完整路径
- 自动处理斜杠，避免重复
- 支持任意深度的嵌套

```typescript
// 路径: /api
{
  path: "/api",
  children: [
    // 路径: /api/v1
    {
      path: "/v1",
      children: [
        // 最终路径: /api/v1/users
        {
          path: "/users",
          // ...
        }
      ]
    }
  ]
}
```

## 使用场景

### 1. 管理员路由组
```typescript
{
  path: "/admin",
  middleware: [requireAuth({ role: 'admin' }), rateLimit({ max: 100, window: '1m' })],
  children: [
    { path: "/dashboard", method: "GET", handler: dashboardHandler },
    { path: "/users", method: "GET", handler: usersHandler },
    { path: "/settings", method: "GET", handler: settingsHandler }
  ]
}
```

### 2. API 版本管理
```typescript
{
  path: "/api",
  middleware: [cors(), jsonParser()],
  children: [
    {
      path: "/v1",
      middleware: [versionCheck('v1')],
      children: [
        { path: "/users", method: "GET", handler: getUsersV1 },
        { path: "/posts", method: "GET", handler: getPostsV1 }
      ]
    },
    {
      path: "/v2",
      middleware: [versionCheck('v2')],
      children: [
        { path: "/users", method: "GET", handler: getUsersV2 },
        { path: "/posts", method: "GET", handler: getPostsV2 }
      ]
    }
  ]
}
```

### 3. 功能模块分组
```typescript
{
  path: "/shop",
  middleware: [auth(), shopMiddleware()],
  children: [
    {
      path: "/products",
      children: [
        { path: "/", method: "GET", handler: listProducts },
        { path: "/:id", method: "GET", handler: getProduct }
      ]
    },
    {
      path: "/orders",
      children: [
        { path: "/", method: "POST", handler: createOrder },
        { path: "/:id", method: "GET", handler: getOrder }
      ]
    }
  ]
}
```

## 运行示例

```bash
# 运行嵌套路由示例
npm run example/advanced/nested-routes.ts

# 运行中间件顺序演示
npm run example/advanced/middleware-order.ts
```

## 注意事项

1. **中间件顺序**: 父路由中间件先执行，子路由中间件后执行
2. **路径冲突**: 框架会自动检测路径冲突并发出警告
3. **性能**: 嵌套路由在启动时会被扁平化，运行时性能不受影响
4. **调试**: 启动时会打印扁平化后的路由信息，便于调试

## 类型定义

```typescript
interface NestedRoute {
  path: string;
  middleware?: Middleware[];
  children?: (NestedRoute | Route)[];
}

interface FlattenedRoute extends Route {
  fullPath: string;
  middlewareChain: Middleware[];
}
```

这个功能让路由组织更加清晰，中间件管理更加灵活，特别适合大型应用的架构设计。
