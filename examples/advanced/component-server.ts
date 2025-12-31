/**
 * 组件服务器示例
 *
 * 展示 SSR 组件路由的使用
 * 运行时无关设计
 */

import { ComponentServer } from "../../src/server/component-server";
import type { NestedComponentRoute } from "../../src/types/component-route";

// 组件路由配置
const routes: NestedComponentRoute[] = [
  {
    path: "/",
    middleware: [],
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
    middleware: [],
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

// 导出 fetch 方法供运行时使用
export default { fetch: server.fetch };

// 也导出 server 实例以便扩展
export { server };

// 使用说明
if (process.env.NODE_ENV !== "test") {
  console.log("🚀 Vafast SSR 组件路由服务器");
  console.log("");
  console.log("📋 可用路由:");
  console.log("  /           - Vue SSR 首页");
  console.log("  /about      - Vue SSR 关于页面");
  console.log("  /admin/dashboard - React SSR 管理员仪表板");
  console.log("");
  console.log("💡 使用方式:");
  console.log("  export default { fetch: server.fetch };");
}
