import { Server, json, parseBody, parseFormData, parseFile } from "./src/index";
import type { Route } from "./src/types";

// 测试增强的请求体解析功能
const routes: Route[] = [
  // 测试 JSON 解析
  {
    method: "POST",
    path: "/test/json",
    handler: async (req) => {
      try {
        const body = await parseBody(req);
        return json({
          success: true,
          type: "JSON",
          data: body,
          contentType: req.headers.get("content-type"),
        });
      } catch (error) {
        return json(
          {
            success: false,
            error: error instanceof Error ? error.message : "未知错误",
          },
          400
        );
      }
    },
  },

  // 测试表单数据解析
  {
    method: "POST",
    path: "/test/form",
    handler: async (req) => {
      try {
        const body = await parseBody(req);
        return json({
          success: true,
          type: "Form Data",
          data: body,
          contentType: req.headers.get("content-type"),
        });
      } catch (error) {
        return json(
          {
            success: false,
            error: error instanceof Error ? error.message : "未知错误",
          },
          400
        );
      }
    },
  },

  // 测试文件上传解析
  {
    method: "POST",
    path: "/test/upload",
    handler: async (req) => {
      try {
        const formData = await parseFormData(req);
        return json({
          success: true,
          type: "File Upload",
          fields: formData.fields,
          files: Object.keys(formData.files).map((key) => ({
            name: formData.files[key].name,
            type: formData.files[key].type,
            size: formData.files[key].size,
          })),
          contentType: req.headers.get("content-type"),
        });
      } catch (error) {
        return json(
          {
            success: false,
            error: error instanceof Error ? error.message : "未知错误",
          },
          400
        );
      }
    },
  },

  // 测试纯文本解析
  {
    method: "POST",
    path: "/test/text",
    handler: async (req) => {
      try {
        const body = await parseBody(req);
        return json({
          success: true,
          type: "Plain Text",
          data: body,
          contentType: req.headers.get("content-type"),
        });
      } catch (error) {
        return json(
          {
            success: false,
            error: error instanceof Error ? error.message : "未知错误",
          },
          400
        );
      }
    },
  },

  // 测试二进制数据解析
  {
    method: "POST",
    path: "/test/binary",
    handler: async (req) => {
      try {
        const body = await parseBody(req);
        return json({
          success: true,
          type: "Binary Data",
          dataSize: body instanceof ArrayBuffer ? body.byteLength : "unknown",
          contentType: req.headers.get("content-type"),
        });
      } catch (error) {
        return json(
          {
            success: false,
            error: error instanceof Error ? error.message : "未知错误",
          },
          400
        );
      }
    },
  },

  // 测试内容长度限制
  {
    method: "POST",
    path: "/test/size-limit",
    handler: async (req) => {
      try {
        const body = await parseBody(req);
        return json({
          success: true,
          message: "内容长度在限制范围内",
          contentType: req.headers.get("content-type"),
        });
      } catch (error) {
        return json(
          {
            success: false,
            error: error instanceof Error ? error.message : "未知错误",
          },
          413
        ); // Payload Too Large
      }
    },
  },
];

const server = new Server(routes);

// 测试函数
async function testEnhancedBodyParsing() {
  console.log("🧪 开始测试增强的请求体解析功能...\n");

  const testCases = [
    // JSON 测试
    {
      name: "JSON 数据",
      method: "POST",
      path: "/test/json",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "测试", age: 25 }),
      expected: "JSON",
    },

    // 表单数据测试
    {
      name: "表单数据",
      method: "POST",
      path: "/test/form",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "name=测试&age=25&city=北京",
      expected: "Form Data",
    },

    // 纯文本测试
    {
      name: "纯文本",
      method: "POST",
      path: "/test/text",
      headers: { "Content-Type": "text/plain" },
      body: "这是一段纯文本内容",
      expected: "Plain Text",
    },

    // 二进制数据测试
    {
      name: "二进制数据",
      method: "POST",
      path: "/test/binary",
      headers: { "Content-Type": "application/octet-stream" },
      body: new ArrayBuffer(1024), // 1KB 数据
      expected: "Binary Data",
    },
  ];

  let successCount = 0;
  let totalCount = testCases.length;

  for (const testCase of testCases) {
    console.log(`📡 测试: ${testCase.name}`);

    const req = new Request(`http://localhost${testCase.path}`, {
      method: testCase.method,
      headers: testCase.headers,
      body: testCase.body,
    });

    try {
      const response = await server.fetch(req);
      const data = await response.json();

      if (data.success && data.type === testCase.expected) {
        console.log(`   ✅ 状态: ${response.status}, 类型: ${data.type}`);
        console.log(`   📊 数据:`, data.data || "无数据");
        successCount++;
      } else {
        console.log(`   ❌ 响应不匹配:`, data);
      }
    } catch (error) {
      console.log(`   ❌ 错误:`, error);
    }

    console.log("");
  }

  console.log(`🎉 增强请求体解析测试完成! 成功: ${successCount}/${totalCount}`);
  console.log(`📊 成功率: ${((successCount / totalCount) * 100).toFixed(1)}%`);

  console.log("\n📝 注意：文件上传测试需要实际的 multipart/form-data 请求");
  console.log("   可以使用 Postman 或其他工具测试 /test/upload 端点");
}

// 直接执行测试
testEnhancedBodyParsing();

export default {
  fetch: (req: Request) => server.fetch(req),
};
