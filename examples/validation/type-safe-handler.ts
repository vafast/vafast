/**
 * 类型安全处理器示例
 *
 * 演示如何使用 createHandler 实现完整的类型推导
 */

import { Type } from "@sinclair/typebox";
import { Server } from "../../src/server";
import { createHandler, createHandlerWithExtra } from "../../src/utils/create-handler";
import type { Route, Middleware } from "../../src/types";

// ============================================
// Schema 定义
// ============================================

/** 创建用户 Schema */
const CreateUserSchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 100 }),
  email: Type.String(),
  age: Type.Optional(Type.Number({ minimum: 0, maximum: 150 })),
  tags: Type.Optional(Type.Array(Type.String())),
});

/** 更新用户 Schema */
const UpdateUserSchema = Type.Object({
  name: Type.Optional(Type.String()),
  email: Type.Optional(Type.String()),
  age: Type.Optional(Type.Number()),
});

/** 分页查询 Schema */
const PaginationSchema = Type.Object({
  page: Type.Optional(Type.String()),
  limit: Type.Optional(Type.String()),
});

/** ID 参数 Schema */
const IdParamSchema = Type.Object({
  id: Type.String(),
});

// ============================================
// 模拟数据
// ============================================

interface User {
  id: number;
  name: string;
  email: string;
  age?: number;
  tags?: string[];
}

let users: User[] = [
  { id: 1, name: "Alice", email: "alice@example.com", age: 25 },
  { id: 2, name: "Bob", email: "bob@example.com", age: 30, tags: ["developer"] },
];
let nextId = 3;

// ============================================
// 中间件定义
// ============================================

/** 认证上下文类型 */
type AuthContext = {
  user: { id: number; role: "admin" | "user" };
};

/** 认证中间件 */
const authMiddleware: Middleware = async (req, next) => {
  const token = req.headers.get("Authorization");
  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 模拟用户信息注入
  (req as unknown as Record<string, unknown>).__locals = {
    user: { id: 1, role: token.includes("admin") ? "admin" : "user" },
  };

  return next();
};

// ============================================
// 路由定义
// ============================================

const routes: Route[] = [
  // GET /users - 获取用户列表
  {
    method: "GET",
    path: "/users",
    handler: createHandler({
      query: PaginationSchema,
    })(({ query }) => {
      // query 类型: { page?: string; limit?: string }
      const page = parseInt(query.page || "1");
      const limit = parseInt(query.limit || "10");
      const start = (page - 1) * limit;
      const paginatedUsers = users.slice(start, start + limit);

      return {
        data: paginatedUsers,
        pagination: {
          page,
          limit,
          total: users.length,
          totalPages: Math.ceil(users.length / limit),
        },
      };
    }),
  },

  // GET /users/:id - 获取单个用户
  {
    method: "GET",
    path: "/users/:id",
    handler: createHandler({
      params: IdParamSchema,
    })(({ params }) => {
      // params 类型: { id: string }
      const user = users.find((u) => u.id === parseInt(params.id));
      if (!user) {
        return {
          data: null,
          status: 404,
          headers: {},
        };
      }
      return user;
    }),
  },

  // POST /users - 创建用户
  {
    method: "POST",
    path: "/users",
    handler: createHandler({
      body: CreateUserSchema,
    })(({ body }) => {
      // body 类型: { name: string; email: string; age?: number; tags?: string[] }
      const newUser: User = {
        id: nextId++,
        name: body.name,
        email: body.email,
        age: body.age,
        tags: body.tags,
      };
      users.push(newUser);

      return {
        data: newUser,
        status: 201,
      };
    }),
  },

  // PUT /users/:id - 更新用户
  {
    method: "PUT",
    path: "/users/:id",
    handler: createHandler({
      params: IdParamSchema,
      body: UpdateUserSchema,
    })(({ params, body }) => {
      // params 类型: { id: string }
      // body 类型: { name?: string; email?: string; age?: number }
      const index = users.findIndex((u) => u.id === parseInt(params.id));
      if (index === -1) {
        return { data: null, status: 404 };
      }

      users[index] = { ...users[index], ...body };
      return users[index];
    }),
  },

  // DELETE /users/:id - 删除用户 (需要认证)
  {
    method: "DELETE",
    path: "/users/:id",
    middleware: [authMiddleware],
    handler: createHandlerWithExtra<AuthContext>()({
      params: IdParamSchema,
    })(({ params, user }) => {
      // params 类型: { id: string }
      // user 类型: { id: number; role: "admin" | "user" }

      // 只有管理员可以删除
      if (user.role !== "admin") {
        return {
          data: { error: "Forbidden", message: "Admin only" },
          status: 403,
        };
      }

      const index = users.findIndex((u) => u.id === parseInt(params.id));
      if (index === -1) {
        return { data: null, status: 404 };
      }

      const deletedUser = users.splice(index, 1)[0];
      return {
        data: { message: "User deleted", user: deletedUser },
        status: 200,
      };
    }),
  },
];

// 创建服务器
const server = new Server(routes);

// 导出
export default { fetch: server.fetch };

// 也导出 server 实例
export { server };

// 测试函数
export async function runTest(): Promise<void> {
  console.log("🚀 类型安全处理器示例");
  console.log("📋 可用路由:");
  console.log("  GET    /users          - 获取用户列表");
  console.log("  GET    /users/:id      - 获取单个用户");
  console.log("  POST   /users          - 创建用户");
  console.log("  PUT    /users/:id      - 更新用户");
  console.log("  DELETE /users/:id      - 删除用户 (需要 Admin 认证)");
  console.log("");

  // 获取列表
  const res1 = await server.fetch(new Request("http://localhost/users"));
  console.log("GET /users:", await res1.json());

  // 获取单个
  const res2 = await server.fetch(new Request("http://localhost/users/1"));
  console.log("GET /users/1:", await res2.json());

  // 创建用户
  const res3 = await server.fetch(
    new Request("http://localhost/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Charlie",
        email: "charlie@example.com",
        age: 28,
      }),
    })
  );
  console.log("POST /users:", await res3.json());

  // 更新用户
  const res4 = await server.fetch(
    new Request("http://localhost/users/1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Alice Updated" }),
    })
  );
  console.log("PUT /users/1:", await res4.json());

  // 删除用户 (无认证)
  const res5 = await server.fetch(
    new Request("http://localhost/users/2", { method: "DELETE" })
  );
  console.log("DELETE /users/2 (无认证):", res5.status);

  // 删除用户 (管理员)
  const res6 = await server.fetch(
    new Request("http://localhost/users/2", {
      method: "DELETE",
      headers: { Authorization: "Bearer admin-token" },
    })
  );
  console.log("DELETE /users/2 (管理员):", await res6.json());
}
