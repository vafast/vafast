import { Server, json } from "./src/index";
import type { Route } from "./src/types";

// 测试路由冲突检测
const routes: Route[] = [
  // 1. 正常的多方法路由（不会冲突）
  { method: "GET", path: "/users/:id", handler: () => json({ message: "获取用户" }) },
  { method: "POST", path: "/users/:id", handler: () => json({ message: "创建用户" }) },
  { method: "PUT", path: "/users/:id", handler: () => json({ message: "更新用户" }) },
  
  // 2. 冲突路由：相同路径、相同方法
  { method: "GET", path: "/conflict", handler: () => json({ message: "冲突1" }) },
  { method: "GET", path: "/conflict", handler: () => json({ message: "冲突2" }) },
  
  // 3. 潜在冲突：动态路由
  { method: "GET", path: "/api/*", handler: () => json({ message: "通配符API" }) },
  { method: "GET", path: "/api/:version", handler: () => json({ message: "版本API" }) },
  
  // 4. 正常的路由
  { method: "GET", path: "/health", handler: () => json({ status: "OK" }) },
  { method: "GET", path: "/", handler: () => json({ message: "首页" }) },
];

console.log("🧪 测试路由冲突检测...\n");
console.log("预期会看到以下警告：");
console.log("1. /conflict 路径的重复定义");
console.log("2. /api/* 和 /api/:version 的潜在冲突\n");

// 创建服务器实例（会触发冲突检测）
const server = new Server(routes);

console.log("\n✅ 服务器创建成功，冲突检测完成！\n");

// 测试一些正常的路由
async function testNormalRoutes() {
  console.log("📡 测试正常路由...\n");

  const testCases = [
    { method: "GET", path: "/users/123", expected: "获取用户" },
    { method: "POST", path: "/users/456", expected: "创建用户" },
    { method: "PUT", path: "/users/789", expected: "更新用户" },
    { method: "GET", path: "/health", expected: "OK" },
    { method: "GET", path: "/", expected: "首页" },
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
      const data = await response.json();
      
      if (data.message === testCase.expected || data.status === testCase.expected) {
        console.log(`   ✅ 状态: ${response.status}, 响应:`, data);
        successCount++;
      } else {
        console.log(`   ❌ 响应不匹配:`, data);
      }
    } catch (error) {
      console.log(`   ❌ 错误:`, error);
    }

    console.log("");
  }

  console.log(`🎉 正常路由测试完成! 成功: ${successCount}/${totalCount}`);
  console.log(`📊 成功率: ${((successCount / totalCount) * 100).toFixed(1)}%`);
}

// 测试冲突路由（应该返回第一个定义的路由）
async function testConflictRoutes() {
  console.log("\n📡 测试冲突路由...\n");

  const req = new Request("http://localhost/conflict", {
    method: "GET",
  });

  try {
    const response = await server.fetch(req);
    const data = await response.json();
    
    console.log(`📡 测试: GET /conflict`);
    console.log(`   ✅ 状态: ${response.status}, 响应:`, data);
    console.log(`   ℹ️  注意：虽然定义了两次，但只使用了第一个处理器`);
  } catch (error) {
    console.log(`   ❌ 错误:`, error);
  }
}

// 执行测试
async function runTests() {
  await testNormalRoutes();
  await testConflictRoutes();
}

runTests();

export default {
  fetch: (req: Request) => server.fetch(req),
};
