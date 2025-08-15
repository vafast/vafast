import { Server } from "../src";
import type { Route } from "../src";

// 性能测试
async function benchmarkRouteRegistration() {
  const iterations = 10000;
  const routes: Route[] = [];

  console.time("路由注册");

  for (let i = 0; i < iterations; i++) {
    routes.push({
      method: "GET",
      path: `/route${i}`,
      handler: (req) =>
        new Response(JSON.stringify({ route: i }), {
          headers: { "Content-Type": "application/json" },
        }),
    });
  }

  console.timeEnd("路由注册");
  console.log(`创建了 ${iterations} 个路由对象`);
}

async function benchmarkServerCreation() {
  const iterations = 1000;
  const routes: Route[] = [
    {
      method: "GET",
      path: "/test",
      handler: (req) => new Response("test"),
    },
  ];

  console.time("服务器创建");

  for (let i = 0; i < iterations; i++) {
    new Server(routes);
  }

  console.timeEnd("服务器创建");
  console.log(`创建了 ${iterations} 个服务器实例`);
}

// 运行性能测试
async function runBenchmarks() {
  console.log("=== Vafast 性能测试 ===\n");

  await benchmarkRouteRegistration();
  console.log("");

  await benchmarkServerCreation();
  console.log("");

  console.log("性能测试完成！");
}

// 直接运行性能测试
runBenchmarks();
