import { Server, json } from "../../src/index";
import type { Route } from "../../src/types";

// 测试所有常见的动态路由模式
const routes: Route[] = [
  // 优先级测试：静态 vs 动态 vs 通配符（顺序被构造函数重排）
  {
    method: "GET",
    path: "/priority/static",
    handler: () => json({ hit: "static" }),
  },
  {
    method: "GET",
    path: "/priority/:type",
    handler: (req, p) => json({ hit: "param", type: p?.type }),
  },
  {
    method: "GET",
    path: "/priority/*",
    handler: (req, p) => json({ hit: "wild", rest: p?.["*"] }),
  },

  // 1. 基础动态参数
  {
    method: "GET",
    path: "/user/:id",
    handler: (req, params) => {
      console.log("访问 /user/:id，参数:", params);
      return json({ userId: params?.id, message: "用户详情" });
    },
  },

  // 2. 通配符匹配
  {
    method: "GET",
    path: "/blog/*",
    handler: (req, params) => {
      console.log("访问 /blog/*，参数:", params);
      return json({ path: params?.["*"], message: "博客文章" });
    },
  },

  // 3. 多级动态参数
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

  // 4. 复杂嵌套路径
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

  // 5. 可选参数（通过通配符实现）
  {
    method: "GET",
    path: "/search/*",
    handler: (req, params) => {
      console.log("访问 /search/*，参数:", params);
      const searchPath = params?.["*"] || "";
      const parts = searchPath.split("/").filter(Boolean);
      return json({
        query: parts[0] || "",
        category: parts[1] || "all",
        page: parts[2] || "1",
        message: "搜索结果",
      });
    },
  },

  // 6. 文件路径模式
  {
    method: "GET",
    path: "/files/*",
    handler: (req, params) => {
      console.log("访问 /files/*，参数:", params);
      return json({
        filePath: params?.["*"],
        message: "文件访问",
      });
    },
  },

  // 7. 多级API路由
  {
    method: "GET",
    path: "/api/:version/:resource/:id",
    handler: (req, params) => {
      console.log("访问 /api/:version/:resource/:id，参数:", params);
      return json({
        version: params?.version,
        resource: params?.resource,
        id: params?.id,
        message: "通用API",
      });
    },
  },

  // 8. 带查询参数的动态路由
  {
    method: "GET",
    path: "/posts/:year/:month/:slug",
    handler: (req, params) => {
      console.log("访问 /posts/:year/:month/:slug，参数:", params);
      return json({
        year: params?.year,
        month: params?.month,
        slug: params?.slug,
        message: "博客文章",
      });
    },
  },

  // 9. 用户操作路由
  {
    method: "PUT",
    path: "/users/:id/profile",
    handler: (req, params) => {
      console.log("访问 /users/:id/profile，参数:", params);
      return json({
        userId: params?.id,
        action: "profile",
        message: "更新用户资料",
      });
    },
  },

  // 10. 嵌套资源路由
  {
    method: "DELETE",
    path: "/users/:userId/posts/:postId/comments/:commentId",
    handler: (req, params) => {
      console.log(
        "访问 /users/:userId/posts/:postId/comments/:commentId，参数:",
        params
      );
      return json({
        userId: params?.userId,
        postId: params?.postId,
        commentId: params?.commentId,
        message: "删除评论",
      });
    },
  },

  // 11. 静态路由作为对比
  {
    method: "GET",
    path: "/health",
    handler: () => {
      return json({ status: "OK", message: "健康检查" });
    },
  },

  // 12. 根路径
  {
    method: "GET",
    path: "/",
    handler: () => {
      return json({ message: "欢迎使用 Vafast 框架" });
    },
  },
];

const server = new Server(routes);

// 测试函数
async function testDynamicRoutes() {
  console.log("🧪 开始测试所有常见动态路由模式...\n");

  const testCases = [
    // 优先级：静态 > 动态 > 通配符
    {
      method: "GET",
      path: "/priority/static",
      expectKey: "hit",
      expectVal: "static",
    },
    {
      method: "GET",
      path: "/priority/any",
      expectKey: "hit",
      expectVal: "param",
    },
    {
      method: "GET",
      path: "/priority/any/extra",
      expectKey: "hit",
      expectVal: "wild",
    },

    // 基础动态参数
    { method: "GET", path: "/user/123", expected: "用户详情" },
    { method: "GET", path: "/user/abc-def", expected: "用户详情" },

    // 通配符匹配
    { method: "GET", path: "/blog/2024/01/hello-world", expected: "博客文章" },
    { method: "GET", path: "/blog/tech/javascript", expected: "博客文章" },

    // 多级动态参数
    { method: "GET", path: "/product/electronics/456", expected: "产品详情" },
    { method: "GET", path: "/product/books/789", expected: "产品详情" },

    // 复杂嵌套路径
    { method: "POST", path: "/api/v1/users/789", expected: "API调用" },
    { method: "POST", path: "/api/v2/users/abc", expected: "API调用" },

    // 可选参数
    { method: "GET", path: "/search/javascript", expected: "搜索结果" },
    {
      method: "GET",
      path: "/search/javascript/frameworks",
      expected: "搜索结果",
    },
    {
      method: "GET",
      path: "/search/javascript/frameworks/2",
      expected: "搜索结果",
    },

    // 文件路径模式
    { method: "GET", path: "/files/docs/api.md", expected: "文件访问" },
    { method: "GET", path: "/files/images/logo.png", expected: "文件访问" },

    // 多级API路由
    { method: "GET", path: "/api/v1/posts/123", expected: "通用API" },
    { method: "GET", path: "/api/v2/comments/456", expected: "通用API" },

    // 带查询参数的动态路由
    {
      method: "GET",
      path: "/posts/2024/01/my-first-post",
      expected: "博客文章",
    },
    { method: "GET", path: "/posts/2023/12/hello-world", expected: "博客文章" },

    // 用户操作路由
    { method: "PUT", path: "/users/123/profile", expected: "更新用户资料" },

    // 嵌套资源路由
    {
      method: "DELETE",
      path: "/users/123/posts/456/comments/789",
      expected: "删除评论",
    },

    // 静态路由
    { method: "GET", path: "/health", expected: "健康检查" },
    { method: "GET", path: "/", expected: "欢迎使用 Vafast 框架" },

    // 测试不匹配的路由
    { method: "GET", path: "/unknown", expected: "Not Found" },
    { method: "GET", path: "/user", expected: "Not Found" },
    { method: "POST", path: "/user/123", expected: "Not Found" },
  ];

  let successCount = 0;
  let totalCount = testCases.length;

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
        if (testCase.expectKey) {
          const ok = data?.[testCase.expectKey] === testCase.expectVal;
          console.log(
            `   ✅ 状态: ${response.status}, 响应:`,
            data,
            ok ? "(优先级正确)" : "(优先级错误)"
          );
          if (ok) successCount++;
        } else {
          console.log(`   ✅ 状态: ${response.status}, 响应:`, data);
          successCount++;
        }
      }
    } catch (error) {
      console.log(`   ❌ 错误:`, error);
    }

    console.log("");
  }

  console.log(`🎉 动态路由测试完成! 成功: ${successCount}/${totalCount}`);
  console.log(`📊 成功率: ${((successCount / totalCount) * 100).toFixed(1)}%`);
}

// 直接执行测试
testDynamicRoutes();

export default {
  fetch: (req: Request) => server.fetch(req),
};
