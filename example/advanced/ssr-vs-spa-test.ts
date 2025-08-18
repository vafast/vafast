import { vueRenderer } from "../../src/middleware/component-renderer";

// 对比 SSR 和 SPA 渲染
async function compareSSRvsSPA() {
  console.log("🧪 对比 SSR vs SPA 渲染...\n");

  // 模拟请求
  const req = new Request("http://localhost:3000/", { method: "GET" });

  // 测试 SSR 渲染
  console.log("=== Vue SSR 渲染 ===");
  const ssrMiddleware = vueRenderer("ssr");
  await ssrMiddleware(req, () => Promise.resolve(new Response()));

  try {
    const ssrResponse = await (req as any).renderVue(() => import("./components/SimpleVue.js"));
    const ssrHtml = await ssrResponse.text();

    console.log(`📊 响应状态: ${ssrResponse.status}`);
    console.log(`📄 HTML 长度: ${ssrHtml.length} 字符`);
    console.log(`🎯 是否包含组件内容: ${ssrHtml.includes("Simple Vue Component") ? "✅" : "❌"}`);
    console.log(
      `🎯 是否包含渲染后的 HTML: ${ssrHtml.includes("<h1>Simple Vue Component</h1>") ? "✅" : "❌"}`
    );
    console.log(`🎯 是否包含时间内容: ${ssrHtml.includes("Current time:") ? "✅" : "❌"}`);

    console.log("\n📄 SSR HTML 片段:");
    const ssrContent = ssrHtml.match(/<div id="app">([\s\S]*?)<\/div>/)?.[1] || "未找到";
    console.log(ssrContent.substring(0, 200) + "...");
  } catch (error) {
    console.error("❌ SSR 渲染失败:", error);
  }

  console.log("\n" + "=".repeat(60) + "\n");

  // 测试 SPA 渲染
  console.log("=== Vue SPA 渲染 ===");
  const spaMiddleware = vueRenderer("spa");
  await spaMiddleware(req, () => Promise.resolve(new Response()));

  try {
    const spaResponse = await (req as any).renderVue(() => import("./components/SimpleVue.js"));
    const spaHtml = await spaResponse.text();

    console.log(`📊 响应状态: ${spaResponse.status}`);
    console.log(`📄 HTML 长度: ${spaHtml.length} 字符`);
    console.log(`🎯 是否包含组件内容: ${spaHtml.includes("Simple Vue Component") ? "✅" : "❌"}`);
    console.log(`🎯 是否包含空的容器: ${spaHtml.includes('<div id="app"></div>') ? "✅" : "❌"}`);
    console.log(`🎯 是否包含 spa.js: ${spaHtml.includes("spa.js") ? "✅" : "❌"}`);

    console.log("\n📄 SPA HTML 片段:");
    const spaContent = spaHtml.match(/<div id="app">([\s\S]*?)<\/div>/)?.[1] || "未找到";
    console.log(spaContent);
  } catch (error) {
    console.error("❌ SPA 渲染失败:", error);
  }

  console.log("\n" + "=".repeat(60));
  console.log("🎉 对比测试完成！");
}

// 运行测试
compareSSRvsSPA();
