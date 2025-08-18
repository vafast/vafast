import { Server, json } from "./src/index";
import type { Route } from "./src/types";

// 测试动态路由
const routes: Route[] = [
  {
    method: "GET",
    path: "/user/:id",
    handler: (req, params) => {
      console.log("访问 /user/:id，参数:", params);
      return json({ userId: params?.id, message: "用户详情" });
    },
  },
  {
    method: "GET",
    path: "/blog/*",
    handler: (req, params) => {
      console.log("访问 /blog/*，参数:", params);
      return json({ path: params?.["*"], message: "博客文章" });
    },
  },
  {
    method: "GET",
    path: "/product/:category/:id",
    handler: (req, params) => {
      console.log("访问 /product/:category/:id，参数:", params);
      return json({
        category: params?.category,
        productId: params?.id,
        message: "产品详情",
      });
    },
  },
  {
    method: "POST",
    path: "/api/:version/users/:userId",
    handler: (req, params) => {
      console.log("访问 /api/:version/users/:userId，参数:", params);
      return json({
        version: params?.version,
        userId: params?.userId,
        message: "API调用",
      });
    },
  },
  // 静态路由作为对比
  {
    method: "GET",
    path: "/health",
    handler: () => {
      return json({ status: "OK", message: "健康检查" });
    },
  },
];

const server = new Server(routes);

// 测试函数
async function testDynamicRoutes() {
  console.log("🧪 开始测试动态路由...\n");

  const testCases = [
    { method: "GET", path: "/user/123", expected: "用户详情" },
    { method: "GET", path: "/blog/2024/01/hello-world", expected: "博客文章" },
    { method: "GET", path: "/product/electronics/456", expected: "产品详情" },
    { method: "POST", path: "/api/v1/users/789", expected: "API调用" },
    { method: "GET", path: "/health", expected: "健康检查" },
    // 测试不匹配的路由
    { method: "GET", path: "/unknown", expected: "Not Found" },
  ];

  for (const testCase of testCases) {
    console.log(`📡 测试: ${testCase.method} ${testCase.path}`);

    const req = new Request(`http://localhost${testCase.path}`, {
      method: testCase.method,
    });

    try {
      const response = await server.fetch(req);

      if (response.status === 404) {
        const text = await response.text();
        console.log(`   ❌ 404 Not Found (预期): ${text}`);
      } else {
        const data = await response.json();
        console.log(`   ✅ 状态: ${response.status}, 响应:`, data);
      }
    } catch (error) {
      console.log(`   ❌ 错误:`, error);
    }

    console.log("");
  }

  console.log("🎉 动态路由测试完成!");
}

// 直接执行测试
testDynamicRoutes();

export default {
  fetch: (req: Request) => server.fetch(req),
};
