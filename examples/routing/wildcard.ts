/**
 * 通配符路由示例
 *
 * 演示如何使用通配符路由 * 和命名通配符 *name
 */

import { Server } from "../../src/server";
import type { Route } from "../../src/types";

// 路由定义
const routes: Route[] = [
  // 默认通配符 - 参数名为 "*"
  {
    method: "GET",
    path: "/files/*",
    handler: (req) => {
      const params = (req as unknown as { params: Record<string, string> })
        .params;
      return new Response(
        JSON.stringify({
          message: "File requested",
          path: params["*"], // 默认参数名
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    },
  },

  // 命名通配符 - 自定义参数名 "filepath"
  {
    method: "GET",
    path: "/static/*filepath",
    handler: (req) => {
      const params = (req as unknown as { params: Record<string, string> })
        .params;
      return new Response(
        JSON.stringify({
          message: "Static file requested",
          filepath: params.filepath, // 自定义参数名
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    },
  },

  // API 代理示例 - 捕获所有 API 路径
  {
    method: "GET",
    path: "/api/*rest",
    handler: (req) => {
      const params = (req as unknown as { params: Record<string, string> })
        .params;
      return new Response(
        JSON.stringify({
          message: "API proxy",
          path: `/api/${params.rest}`,
          segments: params.rest.split("/"),
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    },
  },

  // 下载路由 - 捕获文件名
  {
    method: "GET",
    path: "/download/*file",
    handler: (req) => {
      const params = (req as unknown as { params: Record<string, string> })
        .params;
      const filename = params.file.split("/").pop() || "unknown";
      return new Response(
        JSON.stringify({
          message: "Download requested",
          fullPath: params.file,
          filename,
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
export { server };

// 测试函数
export async function runTest(): Promise<void> {
  console.log("🚀 通配符路由示例");
  console.log("📋 可用路由:");
  console.log("  GET /files/*          - 默认通配符 (params[\"*\"])");
  console.log("  GET /static/*filepath - 命名通配符 (params.filepath)");
  console.log("  GET /api/*rest        - API 代理 (params.rest)");
  console.log("  GET /download/*file   - 下载文件 (params.file)");
  console.log("");

  // 测试默认通配符
  const res1 = await server.fetch(
    new Request("http://localhost/files/docs/readme.md")
  );
  console.log("GET /files/docs/readme.md:");
  console.log("  ", await res1.json());

  // 测试命名通配符
  const res2 = await server.fetch(
    new Request("http://localhost/static/assets/css/style.css")
  );
  console.log("GET /static/assets/css/style.css:");
  console.log("  ", await res2.json());

  // 测试 API 代理
  const res3 = await server.fetch(
    new Request("http://localhost/api/v1/users/123/profile")
  );
  console.log("GET /api/v1/users/123/profile:");
  console.log("  ", await res3.json());

  // 测试下载
  const res4 = await server.fetch(
    new Request("http://localhost/download/uploads/images/photo.jpg")
  );
  console.log("GET /download/uploads/images/photo.jpg:");
  console.log("  ", await res4.json());
}

