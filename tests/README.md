# Vafast 测试

本目录包含 Vafast 框架的测试用例。

## 目录结构

```
tests/
├── unit/                # 单元测试
│   ├── router/          # 路由器测试
│   │   └── radix-tree.test.ts
│   ├── server/          # 服务器测试
│   │   └── server.test.ts
│   ├── types/           # 类型测试
│   │   └── create-handler.test.ts
│   ├── basic.test.ts    # 基础功能测试
│   ├── middleware.test.ts
│   ├── nested-routes.test.ts
│   └── ...
├── integration/         # 集成测试
│   ├── test-dynamic-routes.ts
│   ├── test-route-conflicts.ts
│   └── ...
├── core/               # 核心功能测试
│   ├── factory-routes.test.ts
│   └── parsers.test.ts
├── fixtures/           # 测试固件
│   ├── schemas.ts      # 共享 Schema
│   └── middleware.ts   # 共享中间件
├── utils/              # 测试工具
│   └── test-helpers.ts
└── README.md
```

## 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试文件
npm test tests/unit/server/server.test.ts

# 运行匹配模式的测试
npm test --match "Server"

# 监听模式
npm test --watch
```

## 测试规范

### 单元测试

单元测试应该：
1. 测试单一功能
2. 不依赖外部服务
3. 快速执行

```typescript
import { describe, it, expect } from "vitest";
import { Server } from "../../src/server";

describe("Server", () => {
  describe("基本路由", () => {
    it("应该处理根路径", async () => {
      const server = new Server([
        {
          method: "GET",
          path: "/",
          handler: () => new Response("Hello"),
        },
      ]);

      const req = new Request("http://localhost/");
      const res = await server.fetch(req);

      expect(res.status).toBe(200);
      expect(await res.text()).toBe("Hello");
    });
  });
});
```

### 使用测试工具

```typescript
import {
  createTestServer,
  createTestRequest,
  parseJsonResponse,
} from "../utils/test-helpers";

describe("API 测试", () => {
  it("应该创建用户", async () => {
    const server = createTestServer([
      {
        method: "POST",
        path: "/users",
        handler: () => new Response(JSON.stringify({ id: 1 })),
      },
    ]);

    const req = createTestRequest("/users", {
      method: "POST",
      body: { name: "Test" },
    });

    const res = await server.fetch(req);
    const { status, data } = await parseJsonResponse(res);

    expect(status).toBe(200);
    expect(data.id).toBe(1);
  });
});
```

### 使用共享 Schema

```typescript
import { UserSchema, PaginationSchema } from "../fixtures/schemas";
import { createHandler } from "../../src/utils/create-handler";

const handler = createHandler(
  {
    body: UserSchema,
    query: PaginationSchema,
  },
  ({ body, query }) => {
    // ...
  },
);
```

## 测试覆盖

关键测试区域：

1. **路由器** (`unit/router/`)
   - Radix Tree 匹配
   - 静态/动态/通配符路由
   - 路由优先级

2. **服务器** (`unit/server/`)
   - 请求处理
   - 中间件执行
   - 错误处理

3. **处理器** (`core/`)
   - createHandler 类型推导
   - Schema 验证
   - 响应转换

4. **中间件** (`unit/middleware.test.ts`)
   - 执行顺序
   - 数据注入
   - 错误拦截
