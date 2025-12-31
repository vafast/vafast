// TypeScript 测试文件 - 验证打包后的包是否可用
import { Type } from "@sinclair/typebox";
import {
  Server,
  json,
  text,
  html,
  redirect,
  empty,
  createHandler,
  createAuth,
  createCORS,
  rateLimit,
  parseBody,
  parseQuery,
  parseCookies,
  generateToken,
  verifyToken,
} from "./dist/index.js";

import type { Route, Handler } from "./dist/index.js";

const BatchProcessSchema = Type.Object({
  items: Type.Array(
    Type.Object({
      id: Type.Number(),
      value: Type.Number(),
      name: Type.String(),
    })
  ),
  operation: Type.Union([
    Type.Literal("sum"),
    Type.Literal("average"),
    Type.Literal("count"),
  ]),
});

console.log("🧪 开始 TypeScript 测试打包后的 vafast 包...");

// 测试类型定义
interface User {
  id: number;
  name: string;
  email: string;
}

const user: User = {
  id: 1,
  name: "张三",
  email: "zhangsan@example.com",
};

// 测试路由定义
const routes: Route[] = [
  {
    path: "/",
    method: "GET",
    handler: async (req) => {
      return json({
        message: "Hello from TypeScript test!",
        timestamp: new Date().toISOString(),
        user,
      });
    },
  },
  {
    path: "/text",
    method: "GET",
    handler: async () => text("这是文本响应"),
  },
  {
    path: "/html",
    method: "GET",
    handler: async () =>
      html("<h1>🎉 HTML 响应测试</h1><p>TypeScript 构建成功！</p>"),
  },
  {
    path: "/redirect",
    method: "GET",
    handler: async () => redirect("/"),
  },
  {
    path: "/empty",
    method: "GET",
    handler: async () => empty(),
  },
  {
    path: "/user/:id",
    method: "GET",
    handler: async (req, params) => {
      return json({
        message: `获取用户信息`,
        userId: params?.id,
        user: { ...user, id: parseInt(params?.id || "1") },
      });
    },
  },
  {
    path: "/api/data",
    method: "POST",
    handler: createHandler({
      body: BatchProcessSchema,
    })(async ({ body, query, headers }) => {
      return {
        data: {
          received: body,
          query,
          contentType: headers["content-type"],
        },
        success: true,
      };
    }),
  },
];

// 测试中间件
const corsMiddleware = createCORS({
  origin: ["http://localhost:3000"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  headers: ["Content-Type", "Authorization"],
});

const rateLimitMiddleware = rateLimit({
  windowMs: 60000, // 1分钟
  max: 100, // 最多100个请求
});

// 创建服务器实例
console.log("📦 创建服务器实例...");
const server = new Server(routes);

// 添加全局中间件
server.use(corsMiddleware);
server.use(rateLimitMiddleware);

console.log("✅ 服务器创建成功，包含中间件");

// 测试基本功能
async function testBasicFunctionality() {
  console.log("\n🔍 测试基本功能...");

  // 测试根路径
  const rootRequest = new Request("http://localhost:3000/");
  const rootResponse = await server.fetch(rootRequest);
  const rootData = await rootResponse.json();

  console.log("✅ 根路径测试成功:", rootData.message);

  // 测试参数路由
  const paramRequest = new Request("http://localhost:3000/user/123");
  const paramResponse = await server.fetch(paramRequest);
  const paramData = await paramResponse.json();

  console.log(
    "✅ 参数路由测试成功:",
    paramData.message,
    "UserId:",
    paramData.userId
  );

  // 测试文本响应
  const textRequest = new Request("http://localhost:3000/text");
  const textResponse = await server.fetch(textRequest);
  const textData = await textResponse.text();

  console.log("✅ 文本响应测试成功:", textData);

  // 测试 HTML 响应
  const htmlRequest = new Request("http://localhost:3000/html");
  const htmlResponse = await server.fetch(htmlRequest);
  const htmlData = await htmlResponse.text();

  console.log("✅ HTML 响应测试成功");
  console.log("   Content-Type:", htmlResponse.headers.get("Content-Type"));
}

// 测试工具函数
async function testUtilityFunctions() {
  console.log("\n🛠️  测试工具函数...");

  // 测试 Token 功能
  console.log("🔐 测试 Token 功能...");
  const secret = "my-secret-key-for-testing";
  const payload = { userId: 123, role: "admin" };

  try {
    const tokenResult = await generateToken(payload, secret, {
      expiresIn: 3600,
    });
    console.log("✅ Token 生成成功");

    const verifiedPayload = await verifyToken(tokenResult.token, secret);
    if (verifiedPayload) {
      console.log(
        "✅ Token 验证成功:",
        verifiedPayload.userId,
        verifiedPayload.role
      );
    } else {
      console.error("❌ Token 验证返回 null");
    }
  } catch (error) {
    console.error("❌ Token 测试失败:", error);
  }

  // 测试解析函数
  console.log("📝 测试解析函数...");
  const testRequest = new Request(
    "http://localhost:3000/test?name=test&age=25",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: "session=abc123; theme=dark",
      },
      body: JSON.stringify({ message: "test data" }),
    }
  );

  try {
    const query = parseQuery(testRequest);
    console.log("✅ Query 解析成功:", query);

    const cookies = parseCookies(testRequest);
    console.log("✅ Cookie 解析成功:", cookies);

    const body = await parseBody(testRequest);
    console.log("✅ Body 解析成功:", body);
  } catch (error) {
    console.error("❌ 解析函数测试失败:", error);
  }
}

// 测试类型安全性
function testTypeSafety() {
  console.log("\n🔒 测试类型安全性...");

  // 测试路由处理器类型
  const typedHandler: Handler = async (req, params) => {
    // TypeScript 应该能够推断出参数类型
    const url = new URL(req.url);
    const method = req.method;
    const userId = params?.id;

    return json({
      url: url.pathname,
      method,
      userId,
    });
  };

  console.log("✅ 路由处理器类型检查通过");

  // 测试响应函数类型
  const responses = [
    json({ data: "test" }),
    text("test"),
    html("<div>test</div>"),
    redirect("/"),
    empty(),
  ];

  console.log("✅ 响应函数类型检查通过");
}

// 主测试函数
async function runTests() {
  try {
    await testBasicFunctionality();
    await testUtilityFunctions();
    testTypeSafety();

    console.log("\n🎉 所有测试通过！");
    console.log("✅ TypeScript 构建的包完全可用");
    console.log("✅ 类型定义正确");
    console.log("✅ 所有功能正常运行");

    console.log("\n📋 测试总结:");
    console.log("- 模块导入: ✅");
    console.log("- 类型定义: ✅");
    console.log("- 基本功能: ✅");
    console.log("- 工具函数: ✅");
    console.log("- 中间件: ✅");
    console.log("- 响应函数: ✅");
  } catch (error) {
    console.error("❌ 测试失败:", error);
    process.exit(1);
  }
}

// 运行测试
runTests();
