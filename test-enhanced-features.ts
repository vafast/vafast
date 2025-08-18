import { Server, json, text, html, empty } from "./src/index";
import type { Route } from "./src/types";

// 测试增强功能的路由
const routes: Route[] = [
  // 测试路径标准化
  { method: "GET", path: "/normalize/test", handler: () => json({ message: "路径标准化测试" }) },
  
  // 测试方法不匹配
  { method: "GET", path: "/method-test", handler: () => json({ message: "GET方法" }) },
  { method: "POST", path: "/method-test", handler: () => json({ message: "POST方法" }) },
  
  // 测试多种响应类型
  { method: "GET", path: "/response/text", handler: () => text("这是纯文本响应") },
  { method: "GET", path: "/response/html", handler: () => html("<h1>这是HTML响应</h1>") },
  { method: "GET", path: "/response/empty", handler: () => empty() },
  
  // 测试URL编码路径
  { method: "GET", path: "/url-encoded/test", handler: () => json({ message: "URL编码测试" }) },
  
  // 测试结尾斜杠等价
  { method: "GET", path: "/trailing-slash", handler: () => json({ message: "结尾斜杠测试" }) },
];

const server = new Server(routes);

// 测试函数
async function testEnhancedFeatures() {
  console.log("🧪 开始测试增强功能...\n");

  const testCases = [
    // 路径标准化测试
    { 
      method: "GET", 
      path: "/normalize/test", 
      expected: "路径标准化测试",
      description: "标准路径"
    },
    { 
      method: "GET", 
      path: "/normalize/test/", 
      expected: "路径标准化测试",
      description: "结尾斜杠等价"
    },
    { 
      method: "GET", 
      path: "//normalize//test", 
      expected: "路径标准化测试",
      description: "多斜杠去重"
    },
    
    // URL编码测试
    { 
      method: "GET", 
      path: "/url-encoded%2Ftest", 
      expected: "URL编码测试",
      description: "URL编码路径"
    },
    
    // 结尾斜杠测试
    { 
      method: "GET", 
      path: "/trailing-slash/", 
      expected: "结尾斜杠测试",
      description: "结尾斜杠等价"
    },
    
    // 方法不匹配测试
    { 
      method: "PUT", 
      path: "/method-test", 
      expected: "405",
      description: "方法不匹配应该返回405"
    },
    
    // OPTIONS测试
    { 
      method: "OPTIONS", 
      path: "/method-test", 
      expected: "204",
      description: "OPTIONS应该返回204和Allow头"
    },
    
    // 响应类型测试
    { 
      method: "GET", 
      path: "/response/text", 
      expected: "text",
      description: "纯文本响应"
    },
    { 
      method: "GET", 
      path: "/response/html", 
      expected: "html",
      description: "HTML响应"
    },
    { 
      method: "GET", 
      path: "/response/empty", 
      expected: "204",
      description: "空响应"
    },
    
    // 404测试
    { 
      method: "GET", 
      path: "/unknown", 
      expected: "404",
      description: "不存在的路径"
    },
  ];

  let successCount = 0;
  let totalCount = testCases.length;

  for (const testCase of testCases) {
    console.log(`📡 测试: ${testCase.method} ${testCase.path} (${testCase.description})`);

    const req = new Request(`http://localhost${testCase.path}`, {
      method: testCase.method,
    });

    try {
      const response = await server.fetch(req);
      
      if (response.status === 404) {
        const data = await response.json();
        console.log(`   ❌ 404 Not Found (预期):`, data);
        if (testCase.expected === "404") successCount++;
      } else if (response.status === 405) {
        const data = await response.json();
        const allowHeader = response.headers.get("Allow");
        console.log(`   ✅ 405 Method Not Allowed (预期):`, data, `Allow: ${allowHeader}`);
        if (testCase.expected === "405") successCount++;
      } else if (response.status === 204) {
        const allowHeader = response.headers.get("Allow");
        console.log(`   ✅ 204 No Content (预期): Allow: ${allowHeader}`);
        if (testCase.expected === "204") successCount++;
      } else {
        if (testCase.expected === "text") {
          const contentType = response.headers.get("Content-Type");
          const content = await response.text();
          console.log(`   ✅ 状态: ${response.status}, Content-Type: ${contentType}, 内容: ${content}`);
          if (contentType?.includes("text/plain")) successCount++;
        } else if (testCase.expected === "html") {
          const contentType = response.headers.get("Content-Type");
          const content = await response.text();
          console.log(`   ✅ 状态: ${response.status}, Content-Type: ${contentType}, 内容: ${content}`);
          if (contentType?.includes("text/html")) successCount++;
        } else {
          const data = await response.json();
          console.log(`   ✅ 状态: ${response.status}, 响应:`, data);
          if (data.message === testCase.expected) successCount++;
        }
      }
    } catch (error) {
      console.log(`   ❌ 错误:`, error);
    }

    console.log("");
  }

  console.log(`🎉 增强功能测试完成! 成功: ${successCount}/${totalCount}`);
  console.log(`📊 成功率: ${((successCount / totalCount) * 100).toFixed(1)}%`);
}

// 直接执行测试
testEnhancedFeatures();

export default {
  fetch: (req: Request) => server.fetch(req),
};
