/**
 * 动态路由参数示例
 *
 * 演示如何使用动态路径参数 :param
 */

import { Server } from "../../src/server";
import type { Route } from "../../src/types";

// 模拟用户数据
const users = [
  { id: "1", name: "Alice", email: "alice@example.com" },
  { id: "2", name: "Bob", email: "bob@example.com" },
  { id: "3", name: "Charlie", email: "charlie@example.com" },
];

// 模拟帖子数据
const posts = [
  { id: "1", userId: "1", title: "Hello World", content: "My first post" },
  { id: "2", userId: "1", title: "TypeScript Tips", content: "..." },
  { id: "3", userId: "2", title: "Bun is Fast", content: "..." },
];

// 路由定义
const routes: Route[] = [
  // 单个动态参数
  {
    method: "GET",
    path: "/users/:id",
    handler: (req) => {
      const params = (req as unknown as { params: Record<string, string> }).params;
      const user = users.find((u) => u.id === params.id);

      if (!user) {
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(user), {
        headers: { "Content-Type": "application/json" },
      });
    },
  },

  // 多个动态参数
  {
    method: "GET",
    path: "/users/:userId/posts/:postId",
    handler: (req) => {
      const params = (req as unknown as { params: Record<string, string> }).params;

      // 验证用户存在
      const user = users.find((u) => u.id === params.userId);
      if (!user) {
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 查找帖子
      const post = posts.find(
        (p) => p.id === params.postId && p.userId === params.userId
      );
      if (!post) {
        return new Response(JSON.stringify({ error: "Post not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          user: { id: user.id, name: user.name },
          post,
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    },
  },

  // 获取用户的所有帖子
  {
    method: "GET",
    path: "/users/:userId/posts",
    handler: (req) => {
      const params = (req as unknown as { params: Record<string, string> }).params;

      const user = users.find((u) => u.id === params.userId);
      if (!user) {
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      const userPosts = posts.filter((p) => p.userId === params.userId);

      return new Response(
        JSON.stringify({
          user: { id: user.id, name: user.name },
          posts: userPosts,
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    },
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
  console.log("🚀 动态路由参数示例");
  console.log("📋 可用路由:");
  console.log("  GET /users/:id         - 获取用户");
  console.log("  GET /users/:userId/posts - 获取用户所有帖子");
  console.log("  GET /users/:userId/posts/:postId - 获取特定帖子");
  console.log("");

  // 测试单个参数
  const res1 = await server.fetch(new Request("http://localhost/users/1"));
  console.log("GET /users/1:", await res1.json());

  // 测试多个参数
  const res2 = await server.fetch(
    new Request("http://localhost/users/1/posts/2")
  );
  console.log("GET /users/1/posts/2:", await res2.json());

  // 测试用户帖子列表
  const res3 = await server.fetch(
    new Request("http://localhost/users/1/posts")
  );
  console.log("GET /users/1/posts:", await res3.json());

  // 测试不存在的用户
  const res4 = await server.fetch(new Request("http://localhost/users/999"));
  console.log("GET /users/999:", await res4.json());
}
