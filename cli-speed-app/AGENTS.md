# AGENTS.md - Vafast 项目 AI 开发指南

> 此文件为 AI 编码助手提供项目特定指令，支持 OpenAI Codex、GitHub Copilot 等。

## 项目概述

这是一个使用 **Vafast** 框架构建的 TypeScript Web API 项目。

- **框架**: Vafast - 高性能、类型安全的 TypeScript Web 框架
- **运行时**: Node.js 20+
- **语言**: TypeScript 5.x
- **包管理**: npm

## 项目结构

```
src/
├── index.ts          # 入口文件，启动服务器
├── routes/           # 路由定义（如果有）
├── middleware/       # 中间件（如果有）
└── services/         # 业务逻辑（如果有）
```

## 常用命令

```bash
# 开发
npm run dev           # 启动开发服务器

# 构建
npm run build         # 编译 TypeScript

# 生产
npm start             # 启动生产服务器

# 测试
npm test              # 运行测试
```

## 编码规范

### 路由定义

使用 `defineRoute` 和 `defineRoutes` 定义路由，确保类型安全：

```typescript
import { defineRoute, defineRoutes, Type } from 'vafast'

const routes = defineRoutes([
  defineRoute({
    method: 'GET',
    path: '/users',
    name: 'get_users',
    description: '获取用户列表',
    schema: {
      query: Type.Object({
        page: Type.Number(),
      })
    },
    handler: ({ query }) => ({ users: [], page: query.page })
  })
])
```

### Schema 验证

使用 TypeBox 定义请求/响应 schema：

```typescript
import { Type } from 'vafast'

const UserSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  email: Type.String({ format: 'email' }),
})
```

### 中间件

使用 `defineMiddleware` 定义类型安全的中间件：

```typescript
import { defineMiddleware } from 'vafast'

const authMiddleware = defineMiddleware<{ user: User }>(async (req, next) => {
  const user = await authenticate(req)
  return next({ user })
})
```

### 错误处理（最佳实践）

使用 HTTP 状态码 + `{ code, message }` 格式：

```typescript
import { err } from 'vafast'

// 预定义错误
throw err.notFound('用户不存在')           // HTTP 404, { code: 404, message: "用户不存在" }
throw err.unauthorized('请先登录')        // HTTP 401
throw err.badRequest('参数错误')           // HTTP 400

// 自定义业务错误码
throw err.notFound('用户不存在', 10001)    // HTTP 404, { code: 10001, message: "用户不存在" }

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
console.log(data.users)
```

## 关键原则

1. **类型安全**: 所有 API 接口必须使用 TypeBox schema 定义
2. **函数式**: 优先使用函数而非 class
3. **错误处理**: 使用 `err()` 抛出错误，响应格式为 `{ code, message }`
4. **HTTP 状态码**: 必须使用正确的 HTTP 状态码表示错误
5. **模块化**: 保持函数职责单一

## 测试

```typescript
import { describe, it, expect } from 'vitest'

describe('用户 API', () => {
  it('应该返回用户列表', async () => {
    const response = await fetch('http://localhost:3000/users')
    const data = await response.json()
    expect(data.users).toBeDefined()
  })
  
  it('应该返回 404 错误', async () => {
    const response = await fetch('http://localhost:3000/users/not-exist')
    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.code).toBeDefined()
    expect(data.message).toBeDefined()
  })
})
```

## 注意事项

- 不要使用 `as` 类型断言
- 不要手动 JSON.parse 请求体
- 不要在 handler 中使用 try-catch（框架有全局错误处理）
- 不要返回 200 + `{ success: false }` 格式错误
- 路由必须添加 `name` 和 `description` 以支持 AI tools 和文档生成

## 相关文档

- [Vafast 文档](https://vafast.dev)
- [TypeBox 文档](https://github.com/sinclairzx81/typebox)
