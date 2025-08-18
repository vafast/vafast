import { vueRenderer } from "../../src/middleware/component-renderer";

// 简单的测试
async function testVueRenderer() {
  console.log("🧪 测试 Vue 渲染器...\n");

  // 模拟请求
  const req = new Request("http://localhost:3000/", { method: "GET" });

  // 应用中间件
  const middleware = vueRenderer("ssr");
  await middleware(req, () => Promise.resolve(new Response()));

  // 测试渲染
  try {
    const response = await (req as any).renderVue(() => import("./components/SimpleVue.js"));
    console.log("✅ Vue 组件渲染成功");
    console.log(`📊 响应状态: ${response.status}`);
    console.log(`🔗 Content-Type: ${response.headers.get("Content-Type")}`);

    const html = await response.text();
    console.log(`📄 HTML 长度: ${html.length} 字符`);
    console.log(`🎯 是否包含组件内容: ${html.includes("Simple Vue Component") ? "✅" : "❌"}`);

    // 显示 HTML 内容
    console.log("\n📄 HTML 内容:");
    console.log(html.substring(0, 800) + "...");
  } catch (error) {
    console.error("❌ Vue 组件渲染失败:", error);
  }
}

// 运行测试
testVueRenderer();
