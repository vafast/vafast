import { Server } from "../../src/server";
import type { NestedRoute } from "../../src/types";
import { vueRenderer, reactRenderer } from "../../src/middleware/component-renderer";

// 模拟中间件
const requireAuth = (options: { role?: string } = {}) => {
  return async (req: Request, next: () => Promise<Response>) => {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "未授权访问" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (options.role && options.role === "admin") {
      console.log("验证管理员权限");
    }

    return next();
  };
};

// 组件路由配置
const routes: NestedRoute[] = [
  {
    path: "/",
    middleware: [vueRenderer("ssr")], // Vue SSR 模式
    children: [
      {
        path: "/",
        method: "GET",
        handler: async (req: Request) => {
          // 直接使用 req.renderVue 渲染组件
          return await (req as any).renderVue(() => import("./components/SimpleVue.js"));
        },
      },
      {
        path: "/about",
        method: "GET",
        handler: async (req: Request) => {
          return await (req as any).renderVue(() => import("./components/SimpleVue.js"));
        },
      },
    ],
  },
  {
    path: "/spa",
    middleware: [vueRenderer("spa")], // Vue SPA 模式
    children: [
      {
        path: "/",
        method: "GET",
        handler: async (req: Request) => {
          return await (req as any).renderVue(() => import("./components/SimpleVue.js"));
        },
      },
    ],
  },
  {
    path: "/admin",
    middleware: [
      requireAuth({ role: "admin" }),
      reactRenderer("ssr"), // React SSR 模式
    ],
    children: [
      {
        path: "/dashboard",
        method: "GET",
        handler: async (req: Request) => {
          return await (req as any).renderReact(() => import("./components/SimpleReact.js"));
        },
      },
    ],
  },
];

// 创建服务器实例
const server = new Server(routes);

console.log("🚀 组件路由服务器启动");
console.log("📝 测试路由:");
console.log("  GET / - Vue SSR 首页");
console.log("  GET /about - Vue SSR 关于页面");
console.log("  GET /spa - Vue SPA 页面");
console.log("  GET /admin/dashboard - React SSR 管理员仪表板");
console.log("");

// 测试函数
async function testComponentRoutes() {
  console.log("🧪 测试组件路由...\n");

  // 测试1: Vue SSR 首页
  console.log("=== 测试1: Vue SSR 首页 / ===");
  const req1 = new Request("http://localhost:3000/", { method: "GET" });

  try {
    const res1 = await server.fetch(req1);
    console.log(`📊 响应状态: ${res1.status}`);
    console.log(`🔗 Content-Type: ${res1.headers.get("Content-Type")}`);

    const html1 = await res1.text();
    console.log(`📄 HTML 长度: ${html1.length} 字符`);
    console.log(`🎯 是否包含 Vue 内容: ${html1.includes("Simple Vue Component") ? "✅" : "❌"}`);
  } catch (error) {
    console.error("❌ 测试1失败:", error);
  }

  console.log("\n" + "=".repeat(60) + "\n");

  // 测试2: Vue SSR 关于页面
  console.log("=== 测试2: Vue SSR 关于页面 /about ===");
  const req2 = new Request("http://localhost:3000/about", { method: "GET" });

  try {
    const res2 = await server.fetch(req2);
    console.log(`📊 响应状态: ${res2.status}`);
    console.log(`🔗 Content-Type: ${res2.headers.get("Content-Type")}`);

    const html2 = await res2.text();
    console.log(`📄 HTML 长度: ${html2.length} 字符`);
    console.log(`🎯 是否包含组件内容: ${html2.includes("Simple Vue Component") ? "✅" : "❌"}`);
  } catch (error) {
    console.error("❌ 测试2失败:", error);
  }

  console.log("\n" + "=".repeat(60) + "\n");

  // 测试3: Vue SPA 页面
  console.log("=== 测试3: Vue SPA 页面 /spa ===");
  const req3 = new Request("http://localhost:3000/spa", { method: "GET" });

  try {
    const res3 = await server.fetch(req3);
    console.log(`📊 响应状态: ${res3.status}`);
    console.log(`🔗 Content-Type: ${res3.headers.get("Content-Type")}`);

    const html3 = await res3.text();
    console.log(`📄 HTML 长度: ${html3.length} 字符`);
    console.log(`🎯 是否包含 SPA 容器: ${html3.includes('<div id="app"></div>') ? "✅" : "❌"}`);
    console.log(`🎯 是否包含 spa.js: ${html3.includes("spa.js") ? "✅" : "❌"}`);
    console.log(`🎯 是否包含路由信息: ${html3.includes("__ROUTE_INFO__") ? "✅" : "❌"}`);
  } catch (error) {
    console.error("❌ 测试3失败:", error);
  }

  console.log("\n" + "=".repeat(60) + "\n");

  // 测试4: React SSR 管理员仪表板
  console.log("=== 测试4: React SSR 管理员仪表板 /admin/dashboard ===");
  const req4 = new Request("http://localhost:3000/admin/dashboard", {
    method: "GET",
    headers: { Authorization: "Bearer admin-token" },
  });

  try {
    const res4 = await server.fetch(req4);
    console.log(`📊 响应状态: ${res4.status}`);
    console.log(`🔗 Content-Type: ${res4.headers.get("Content-Type")}`);

    const html4 = await res4.text();
    console.log(`📄 HTML 长度: ${html4.length} 字符`);
    console.log(
      `🎯 是否包含 React 内容: ${html4.includes("Simple React Component") ? "✅" : "❌"}`
    );
    console.log(`🎯 是否包含组件内容: ${html4.includes("Simple React Component") ? "✅" : "❌"}`);
  } catch (error) {
    console.error("❌ 测试4失败:", error);
  }

  console.log("\n" + "=".repeat(60));
  console.log("🎉 测试完成！");
}

// 运行测试
testComponentRoutes();

export { server };
