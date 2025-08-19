import { ComponentServer } from "../../src/server/component-server";
import type { ComponentRoute, NestedComponentRoute } from "../../src/types/component-route";

// 组件路由配置 - 直接使用中间件
const routes: NestedComponentRoute[] = [
  {
    path: "/",
    middleware: [], // 不需要渲染器中间件，服务器会自动处理
    children: [
      {
        path: "/",
        component: () => import("./components/SimpleVue.js"),
      },
      {
        path: "/about",
        component: () => import("./components/SimpleVue.js"),
      },
    ],
  },
  {
    path: "/admin",
    middleware: [], // 不需要渲染器中间件，服务器会自动处理
    children: [
      {
        path: "/dashboard",
        component: () => import("./components/SimpleReact.js"),
      },
    ],
  },
];

// 创建组件路由服务器实例
const server = new ComponentServer(routes);

// 启动 HTTP 服务器
const port = 3000;
const host = "localhost";

console.log("🚀 Vafast SSR 组件路由服务器启动");
console.log(`📝 访问地址:`);
console.log(`  http://${host}:${port}/ - Vue SSR 首页`);
console.log(`  http://${host}:${port}/about - Vue SSR 关于页面`);
console.log(`  http://${host}:${port}/admin/dashboard - React SSR 管理员仪表板`);
console.log("");

// 创建 HTTP 服务器
const httpServer = Bun.serve({
  port,
  hostname: host,
  fetch: async (req: Request) => {
    const url = new URL(req.url);

    // 静态文件服务 - 只保留客户端激活脚本
    if (url.pathname === "/client.js") {
      const file = Bun.file("./example/advanced/public/client.js");
      return new Response(file, {
        headers: { "Content-Type": "application/javascript" },
      });
    }

    // 组件路由处理
    return server.fetch(req);
  },
});

console.log(`✅ 服务器运行在 http://${host}:${port}`);
console.log("🌐 现在可以通过浏览器访问上述地址了！");
console.log("");
console.log("💡 专注 SSR 的优势:");
console.log("  - 服务端渲染，SEO 友好");
console.log("  - 首屏性能优秀");
console.log("  - 嵌套路由 + 中间件继承");
console.log("  - 类型安全的服务端开发");
console.log("  - 声明式组件路由配置");
console.log("  - 按 Ctrl+C 停止服务器");

export { server, httpServer };
