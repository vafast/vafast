# GitHub Copilot 指令 - Vafast 项目

## 项目框架

这是一个 **Vafast** TypeScript Web API 项目。Vafast 是一个高性能、类型安全的 Web 框架。

## 代码风格

- 使用 TypeScript 严格模式
- 优先使用函数式编程，避免 class
- 使用 2 空格缩进
- 使用单引号
- 不使用分号

## 路由定义模式

生成路由时，请使用以下模式：

```typescript
import { defineRoute, defineRoutes, Type } from 'vafast'

defineRoute({
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: '/path',
  name: 'operation_name',      // snake_case，用于 AI tools
  description: '接口描述',      // 中文描述
  schema: {
    query: Type.Object({...}),  // GET 参数
    body: Type.Object({...}),   // POST/PUT 请求体
    params: Type.Object({...}), // 路径参数
  },
  handler: (ctx) => {
    // 返回对象，自动序列化为 JSON
    return { ... }
  }
})
```

## Schema 定义

使用 TypeBox 而非手写接口：

```typescript
// ✅ 正确
const UserSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  email: Type.String({ format: 'email' }),
})

// ❌ 避免
interface User {
  id: string
  name: string
  email: string
}
```

## 中间件模式

```typescript
import { defineMiddleware } from 'vafast'

const authMiddleware = defineMiddleware<{ user: User }>(async (req, next) => {
  const user = await verifyToken(req)
  return next({ user })
})
```

## 错误处理（最佳实践）

使用 HTTP 状态码 + `{ code, message }` 格式：

```typescript
import { err } from 'vafast'

// ✅ 正确：使用 err() 抛出错误
throw err.notFound('用户不存在')           // HTTP 404, { code: 404, message: "用户不存在" }
throw err.notFound('用户不存在', 10001)    // HTTP 404, { code: 10001, message: "用户不存在" }
throw err.unauthorized('请先登录')        // HTTP 401
throw err.badRequest('参数错误')           // HTTP 400

// ❌ 错误：不要返回 200 + success: false
return { success: false, message: '错误' }
```

**错误响应格式：**

```json
HTTP 404 Not Found

{
  "code": 10001,
  "message": "用户不存在"
}
```

## SSE 流式响应

```typescript
import { defineRoute, sse } from 'vafast'

defineRoute({
  method: 'GET',
  path: '/stream',
  sse: true,
  handler: async function* () {
    yield { status: 'start' }
    yield { text: 'chunk' }
    yield sse({ event: 'end' }, { done: true })
  },
})
```

## API 客户端（@vafast/api-client）

```typescript
import { createClient, eden, InferEden } from '@vafast/api-client'

// 创建客户端
const client = createClient('http://localhost:3000')
  .headers({ 'Authorization': 'Bearer token' })
  .timeout(30000)

// 类型推断
type Api = InferEden<typeof routes>
const api = eden<Api>(client)

// Go 风格错误处理
const { data, error } = await api.users.get({ page: 1 })
if (error) {
  console.error(`错误 ${error.code}: ${error.message}`)
  return
}
```

## 禁止事项

- 不要使用 `as` 类型断言
- 不要使用 `any` 类型
- 不要手动 JSON.parse/stringify
- 不要使用 class 定义路由
- 不要创建统一的类型导出文件
- 不要返回 200 + `{ success: false }` 格式错误
