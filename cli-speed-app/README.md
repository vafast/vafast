# Vafast App

使用 [Vafast](https://github.com/vafast/vafast) 构建的高性能 TypeScript Web API。

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build

# 生产模式
npm start
```

## 项目结构

```
├── .cursor/
│   └── rules/
│       ├── vafast.mdc        # Cursor AI 规则
│       └── typescript.mdc    # TypeScript 规范
├── .github/
│   └── copilot-instructions.md  # GitHub Copilot 指令
├── src/
│   └── index.ts              # 入口文件
├── AGENTS.md                 # AI 开发指南（OpenAI Codex）
├── CLAUDE.md                 # Claude 项目规则
└── package.json
```

## AI 辅助开发

本项目内置 AI 开发规则，让 Cursor、GitHub Copilot、Claude 等 AI 工具更懂 Vafast：

| 文件 | 用途 | AI 工具 |
|------|------|---------|
| `.cursor/rules/*.mdc` | 项目规则 | Cursor |
| `.github/copilot-instructions.md` | 编码指令 | GitHub Copilot |
| `AGENTS.md` | 项目指南 | OpenAI Codex, GitHub Copilot Agent |
| `CLAUDE.md` | 项目规则 | Claude |

## 添加路由

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
        limit: Type.Optional(Type.Number()),
      })
    },
    handler: ({ query }) => ({
      users: [],
      page: query.page,
    })
  }),
  
  defineRoute({
    method: 'POST',
    path: '/users',
    name: 'create_user',
    description: '创建用户',
    schema: {
      body: Type.Object({
        name: Type.String(),
        email: Type.String({ format: 'email' }),
      })
    },
    handler: ({ body }) => ({
      id: crypto.randomUUID(),
      ...body,
    })
  })
])
```

## 添加中间件

```typescript
import { defineMiddleware } from 'vafast'

const authMiddleware = defineMiddleware<{ user: User }>(async (req, next) => {
  const token = req.headers.get('Authorization')
  const user = await verifyToken(token)
  return next({ user })
})

// 在路由中使用
defineRoute({
  method: 'GET',
  path: '/profile',
  middleware: [authMiddleware],
  handler: ({ user }) => ({ id: user.id, name: user.name })
})
```

## 相关链接

- [Vafast 文档](https://vafast.dev)
- [GitHub](https://github.com/vafast/vafast)
