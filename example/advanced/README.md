# 嵌套路由和中间件继承

这个示例展示了 Vafast 框架的嵌套路由功能，支持路由分组和中间件继承。

## 特性

- **路由分组**: 将相关路由组织在一起，提高代码可读性
- **中间件继承**: 子路由自动继承父路由的中间件
- **路径拼接**: 自动拼接父路由和子路由的路径
- **中间件链**: 支持复杂的中间件组合

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
bun run example/advanced/nested-routes.ts
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
