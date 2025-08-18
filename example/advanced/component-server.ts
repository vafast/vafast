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

// 启动 HTTP 服务器
const port = 3000;
const host = "localhost";

console.log("🚀 组件路由服务器启动");
console.log(`📝 访问地址:`);
console.log(`  http://${host}:${port}/ - Vue SSR 首页`);
console.log(`  http://${host}:${port}/about - Vue SSR 关于页面`);
console.log(`  http://${host}:${port}/spa - Vue SPA 页面`);
console.log(
  `  http://${host}:${port}/admin/dashboard - React SSR 管理员仪表板 (需要 Authorization 头)`
);
console.log("");

// 创建 HTTP 服务器
const httpServer = Bun.serve({
  port,
  hostname: host,
  fetch: async (req: Request) => {
    const url = new URL(req.url);

    // 静态文件服务
    if (url.pathname === "/spa.js") {
      const file = Bun.file("./example/advanced/public/spa.js");
      return new Response(file, {
        headers: { "Content-Type": "application/javascript" },
      });
    }

    if (url.pathname === "/client.js") {
      const file = Bun.file("./example/advanced/public/client.js");
      return new Response(file, {
        headers: { "Content-Type": "application/javascript" },
      });
    }

    // 路由处理
    return server.fetch(req);
  },
});

console.log(`✅ 服务器运行在 http://${host}:${port}`);
console.log("🌐 现在可以通过浏览器访问上述地址了！");
console.log("");
console.log("💡 提示:");
console.log("  - 首页和关于页面会显示服务端渲染的 Vue 组件");
console.log("  - SPA 页面会显示空的容器，等待客户端渲染");
console.log("  - 管理员页面需要设置 Authorization 头才能访问");
console.log("  - 按 Ctrl+C 停止服务器");

export { server, httpServer };
