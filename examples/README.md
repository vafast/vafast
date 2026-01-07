# Vafast 示例

本目录包含 Vafast 框架的各种使用示例。

## 目录结构

```
examples/
├── basics/              # 基础示例
│   └── hello-world.ts   # 简单的 Hello World
├── routing/             # 路由示例
│   ├── dynamic-params.ts # 动态路由参数
│   └── wildcard.ts      # 通配符路由
├── validation/          # 验证示例
│   └── type-safe-handler.ts # 类型安全处理器
├── middleware/          # 中间件示例
│   └── nested-routes.ts # 嵌套路由与中间件
├── advanced/            # 高级示例
│   ├── schema.ts        # Schema 验证综合示例
│   └── component-server.ts # 组件服务器
└── README.md
```

## 快速开始

### 基础示例

```typescript
import { Server, createHandler } from "vafast";
import { Type } from "@sinclair/typebox";

// 创建路由
const routes = [
  {
    method: "GET",
    path: "/",
    handler: createHandler(() => "Hello World"),
  },
  {
    method: "POST",
    path: "/users",
    handler: createHandler(
      {
        body: Type.Object({
          name: Type.String(),
          email: Type.String(),
        }),
      },
      ({ body }) => ({
        id: 1,
        name: body.name,
        email: body.email,
      })
    ),
  },
];

// 创建服务器
const server = new Server(routes);

export default { fetch: server.fetch };
```

## 核心特性

### 1. createHandler - 类型安全处理器

```typescript
import { createHandler } from "vafast";
import { Type } from "@sinclair/typebox";

// 定义 Schema
const CreateUserSchema = Type.Object({
  name: Type.String(),
  email: Type.String(),
  age: Type.Optional(Type.Number()),
});

// 创建处理器 - body 自动获得完整类型推导
const handler = createHandler(
  { body: CreateUserSchema },
  ({ body }) => {
    // body 类型: { name: string; email: string; age?: number }
    return { success: true, user: body };
  }
);
```

### 2. 动态路由参数

```typescript
import { Server, createHandler } from "vafast";
import { Type } from "@sinclair/typebox";

const routes = [
  {
    method: "GET",
    path: "/users/:id",
    handler: createHandler(
      { params: Type.Object({ id: Type.String() }) },
      ({ params }) => {
        // params.id 是 string 类型
        return { userId: params.id };
      }
    ),
  },
];
```

### 3. 通配符路由

```typescript
import { Server, createHandler } from "vafast";

const routes = [
  // 默认通配符 - 参数名为 "*"
  {
    method: "GET",
    path: "/files/*",
    handler: createHandler(({ params }) => {
      // params["*"] = "path/to/file.txt"
      return { filepath: params["*"] };
    }),
  },

  // 命名通配符 - 自定义参数名
  {
    method: "GET",
    path: "/static/*filepath",
    handler: createHandler(({ params }) => {
      // params.filepath = "assets/css/style.css"
      return { filepath: params.filepath };
    }),
  },
];
```

### 4. 中间件注入类型化数据

```typescript
import { createHandlerWithExtra, setLocals, json } from "vafast";
import { Type } from "@sinclair/typebox";

// 定义中间件注入的类型
type AuthContext = {
  user: { id: number; role: "admin" | "user" };
};

// 认证中间件
const authMiddleware = async (req: Request, next: () => Promise<Response>) => {
  const token = req.headers.get("Authorization");
  if (!token) {
    return json({ error: "Unauthorized" }, 401);
  }

  // 注入类型化数据
  setLocals(req, {
    user: { id: 1, role: "admin" },
  });

  return next();
};

// 创建带额外上下文的处理器
const handler = createHandlerWithExtra<AuthContext>(
  { body: Type.Object({ action: Type.String() }) },
  ({ body, user }) => {
    // body: { action: string }
    // user: { id: number; role: "admin" | "user" }
    return { success: true, operator: user.id };
  }
);
```

## 运行示例

```bash
# 运行特定示例
bun run examples/routing/dynamic-params.ts

# 运行高级示例
bun run examples/advanced/schema.ts
```

## 示例说明

### routing/dynamic-params.ts
演示动态路由参数的使用：
- 单个参数: `/users/:id`
- 多个参数: `/users/:userId/posts/:postId`
- 获取参数: `params.id`, `params.userId`

### routing/wildcard.ts
演示通配符路由的使用：
- 默认通配符: `/files/*` -> `params["*"]`
- 命名通配符: `/static/*filepath` -> `params.filepath`
- API 代理: `/api/*rest` -> 捕获所有 API 路径

### validation/type-safe-handler.ts
演示完整的 CRUD API 实现：
- GET 列表 (带分页)
- GET 单个
- POST 创建 (body 验证)
- PUT 更新
- DELETE 删除 (认证)

### advanced/schema.ts
演示所有 Schema 验证功能：
- body Schema
- query Schema
- params Schema
- headers Schema
- cookies Schema
- 中间件数据注入
