import { Server } from "../../src/server";
import type { NestedRoute } from "../../src/types";

// 创建带编号的中间件，用于跟踪执行顺序
const createNumberedMiddleware = (name: string, number: number) => {
  return async (req: Request, next: () => Promise<Response>) => {
    console.log(`🔄 [${number}] 进入中间件: ${name}`);

    // 在请求处理前执行
    const startTime = Date.now();

    // 调用下一个中间件或处理器
    const response = await next();

    // 在响应返回后执行
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`✅ [${number}] 离开中间件: ${name} (耗时: ${duration}ms)`);

    return response;
  };
};

// 模拟处理器
const demoHandler = async (req: Request) => {
  console.log("🎯 执行处理器函数");
  return new Response(
    JSON.stringify({
      message: "中间件执行顺序演示",
      timestamp: new Date().toISOString(),
      path: new URL(req.url).pathname,
    }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );
};

// 嵌套路由配置 - 演示中间件执行顺序
const routes: NestedRoute[] = [
  {
    path: "/demo",
    middleware: [
      createNumberedMiddleware("全局中间件1", 1),
      createNumberedMiddleware("全局中间件2", 2),
    ],
    children: [
      {
        path: "/level1",
        middleware: [
          createNumberedMiddleware("一级中间件1", 3),
          createNumberedMiddleware("一级中间件2", 4),
        ],
        children: [
          {
            path: "/level2",
            middleware: [
              createNumberedMiddleware("二级中间件1", 5),
              createNumberedMiddleware("二级中间件2", 6),
            ],
            children: [
              {
                path: "/final",
                method: "GET",
                handler: demoHandler,
                middleware: [
                  createNumberedMiddleware("最终中间件1", 7),
                  createNumberedMiddleware("最终中间件2", 8),
                ],
              },
            ],
          },
        ],
      },
    ],
  },

  // 另一个示例：展示不同层级的中间件
  {
    path: "/api",
    middleware: [createNumberedMiddleware("API网关", 10), createNumberedMiddleware("CORS", 11)],
    children: [
      {
        path: "/v1",
        middleware: [
          createNumberedMiddleware("版本检查", 12),
          createNumberedMiddleware("限流", 13),
        ],
        children: [
          {
            path: "/users",
            method: "GET",
            handler: demoHandler,
            middleware: [
              createNumberedMiddleware("用户权限", 14),
              createNumberedMiddleware("缓存", 15),
            ],
          },
        ],
      },
    ],
  },
];

// 创建服务器实例
const server = new Server(routes);

console.log("🚀 中间件执行顺序演示服务器启动");
console.log("📝 测试路由:");
console.log("  GET /demo/level1/level2/final - 演示多层嵌套中间件");
console.log("  GET /api/v1/users - 演示API中间件链");
console.log("");

// 测试函数
async function testMiddlewareOrder() {
  console.log("🧪 测试中间件执行顺序...\n");

  // 测试1: 多层嵌套路由
  console.log("=== 测试1: 多层嵌套路由 /demo/level1/level2/final ===");
  const req1 = new Request("http://localhost:3000/demo/level1/level2/final", {
    method: "GET",
  });

  try {
    const res1 = await server.fetch(req1);
    console.log(`\n📊 响应状态: ${res1.status}`);

    const body1 = await res1.json();
    console.log(`📄 响应内容:`, body1);
  } catch (error) {
    console.error("❌ 测试1失败:", error);
  }

  console.log("\n" + "=".repeat(60) + "\n");

  // 测试2: API路由
  console.log("=== 测试2: API路由 /api/v1/users ===");
  const req2 = new Request("http://localhost:3000/api/v1/users", {
    method: "GET",
  });

  try {
    const res2 = await server.fetch(req2);
    console.log(`\n📊 响应状态: ${res2.status}`);

    const body2 = await res2.json();
    console.log(`📄 响应内容:`, body2);
  } catch (error) {
    console.error("❌ 测试2失败:", error);
  }

  console.log("\n" + "=".repeat(60));
  console.log("🎉 测试完成！");
}

// 运行测试
testMiddlewareOrder();

export { server };
