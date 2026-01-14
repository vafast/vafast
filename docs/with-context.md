# withContext - 父级中间件类型注入

## 问题场景

当中间件在父级路由定义，子路由的 handler 无法自动推断中间件注入的类型：

```typescript
import { defineRoute, defineRoutes, defineMiddleware } from 'vafast'

// 定义认证中间件，注入 userInfo
const authMiddleware = defineMiddleware<{ userInfo: UserInfo }>(async (req, next) => {
  const userInfo = await verifyToken(req)
  return next({ userInfo })  // 注入上下文
})

// ❌ 问题：子路由无法自动推断 userInfo 类型
defineRoutes([
  defineRoute({
    path: '/api',
    middleware: [authMiddleware],  // ← 中间件在父级
    children: [
      defineRoute({
        method: 'GET',
        path: '/profile',
        handler: ({ userInfo }) => { ... }  // ❌ TS Error: userInfo 不存在
      })
    ]
  })
])
```

**原因**：TypeScript 只能在同一个函数调用中推断类型，`children` 中的 `defineRoute` 是独立的函数调用，无法感知父级的 `middleware` 类型。

---

## 解决方案：withContext

`withContext` 是一个工厂函数，创建带预设上下文类型的路由定义器：

```typescript
import { defineRoute, defineRoutes, withContext } from 'vafast'

// 1. 创建带 UserInfo 上下文的路由定义器
const defineAuthRoute = withContext<{ userInfo: UserInfo }>()

// 2. 使用 defineAuthRoute 替代 defineRoute
defineRoutes([
  defineRoute({
    path: '/api',
    middleware: [authMiddleware],
    children: [
      defineAuthRoute({  // ← 使用 defineAuthRoute
        method: 'GET',
        path: '/profile',
        handler: ({ userInfo }) => {
          // ✅ userInfo 自动有类型！
          return { id: userInfo.id, email: userInfo.email }
        }
      })
    ]
  })
])
```

---

## 推荐用法：统一导出

在 `middleware/index.ts` 中定义并导出：

```typescript
// middleware/index.ts
import { withContext } from 'vafast'

export interface UserInfo {
  id: string
  email: string
  role: string
}

// 创建预设的路由定义器
export const defineAuthRoute = withContext<{ userInfo: UserInfo }>()
export const defineOptionalAuthRoute = withContext<{ userInfo?: UserInfo }>()
```

在路由文件中使用：

```typescript
// routes/users.ts
import { defineRoute, defineRoutes } from 'vafast'
import { authenticate, defineAuthRoute } from '~/middleware'

export const usersRoutes = defineRoutes([
  defineRoute({
    path: '/users',
    middleware: [authenticate],
    children: [
      defineAuthRoute({
        method: 'GET',
        path: '/me',
        handler: ({ userInfo }) => {
          return { id: userInfo.id, email: userInfo.email }
        }
      }),
      
      defineAuthRoute({
        method: 'PUT',
        path: '/me',
        schema: {
          body: Type.Object({ name: Type.String() })
        },
        handler: ({ body, userInfo }) => {
          // body 和 userInfo 都有类型
          return { updated: true, by: userInfo.id }
        }
      })
    ]
  })
])
```

---

## 其他解决方案

### 方案 B：context 属性

每个路由单独声明上下文类型：

```typescript
defineRoute({
  method: 'GET',
  path: '/profile',
  context: {} as { userInfo: UserInfo },  // ← 类型声明
  handler: ({ userInfo }) => { ... }
})
```

**适用场景**：少量路由需要上下文时

### 方案 C：中间件在同级声明

```typescript
defineRoute({
  method: 'GET',
  path: '/profile',
  middleware: [authMiddleware],  // ← 中间件在同级
  handler: ({ userInfo }) => { ... }  // ✅ 自动推断
})
```

**适用场景**：单个路由独立使用中间件

---

## 方案对比

| 方案 | 写法 | 适用场景 |
|------|------|----------|
| **withContext** | `defineAuthRoute({ ... })` | 多个路由共享上下文 ⭐ |
| **context 属性** | `context: {} as { userInfo }` | 少量路由需要上下文 |
| **同级中间件** | `middleware: [auth]` | 单个路由独立使用 |

---

## 完整示例

```typescript
import { defineRoute, defineRoutes, defineMiddleware, withContext, Type } from 'vafast'

// 1. 定义类型
interface UserInfo {
  id: string
  email: string
  role: 'admin' | 'user'
}

// 2. 定义中间件
const authMiddleware = defineMiddleware<{ userInfo: UserInfo }>(async (req, next) => {
  const token = req.headers.get('Authorization')
  if (!token) {
    return new Response('Unauthorized', { status: 401 })
  }
  const userInfo = await verifyToken(token)
  return next({ userInfo })
})

// 3. 创建带类型的路由定义器
const defineAuthRoute = withContext<{ userInfo: UserInfo }>()

// 4. 定义路由
export const routes = defineRoutes([
  // 公开路由 - 使用普通 defineRoute
  defineRoute({
    method: 'GET',
    path: '/health',
    handler: () => ({ status: 'ok' })
  }),

  // 需要认证的路由组
  defineRoute({
    path: '/api',
    middleware: [authMiddleware],
    children: [
      // 使用 defineAuthRoute，userInfo 自动有类型
      defineAuthRoute({
        method: 'GET',
        path: '/me',
        handler: ({ userInfo }) => ({
          id: userInfo.id,
          email: userInfo.email,
          isAdmin: userInfo.role === 'admin'
        })
      }),

      defineAuthRoute({
        method: 'PUT',
        path: '/me',
        schema: {
          body: Type.Object({
            name: Type.String(),
            avatar: Type.Optional(Type.String())
          })
        },
        handler: ({ body, userInfo }) => {
          // body: { name: string, avatar?: string }
          // userInfo: UserInfo
          return {
            success: true,
            updatedBy: userInfo.id,
            data: body
          }
        }
      })
    ]
  })
])
```

---

## FAQ

### Q: 为什么不能自动从父级推断类型？

A: 这是 TypeScript 的限制。TypeScript 只能在**同一个函数调用**中推断泛型类型，无法跨函数调用传递类型信息。

### Q: withContext 会影响运行时性能吗？

A: 不会。`withContext` 只是类型层面的包装，编译后和普通 `defineRoute` 完全相同。

### Q: 可以嵌套使用 withContext 吗？

A: 可以，类型会合并：

```typescript
const defineAuthRoute = withContext<{ userInfo: UserInfo }>()
const defineAdminRoute = withContext<{ userInfo: UserInfo; isAdmin: boolean }>()

// 使用不同的定义器
defineAuthRoute({ ... })   // userInfo
defineAdminRoute({ ... })  // userInfo + isAdmin
```
