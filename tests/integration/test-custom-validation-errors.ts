import { Server, json, withExtra } from "./src/index";
import type { ValidationErrorHandler } from "./src/utils/route-handler-factory";
import { Type } from "@sinclair/typebox";
import type { Route } from "./src/types";

// 测试用的Schema
const TestSchema = Type.Object({
  name: Type.String({ minLength: 2, maxLength: 10 }),
  age: Type.Number({ minimum: 18, maximum: 100 }),
});

// 自定义错误处理器 - 测试用
const testValidationErrorHandler: ValidationErrorHandler = (error, field, value, schema) => {
  return json(
    {
      success: false,
      customError: true,
      field,
      value,
      message: `字段 ${field} 验证失败: ${error.message}`,
      timestamp: new Date().toISOString(),
    },
    400
  );
};

// 创建测试路由
const routes: Route[] = [
  {
    method: "POST",
    path: "/test/custom",
    handler: withExtra()(
      {
        body: TestSchema,
        validationErrorHandler: testValidationErrorHandler,
      },
      ({ body }) => {
        return json({
          success: true,
          message: "验证通过",
          data: body,
        });
      }
    ),
  },
  {
    method: "POST",
    path: "/test/default",
    handler: withExtra()(
      {
        body: TestSchema,
        // 使用默认错误处理器
      },
      ({ body }) => {
        return json({
          success: true,
          message: "验证通过",
          data: body,
        });
      }
    ),
  },
];

const server = new Server(routes);

// 测试函数
async function testCustomValidationErrors() {
  console.log("🧪 测试自定义验证错误处理器...\n");

  const testCases = [
    {
      name: "自定义错误处理器 - 姓名太短",
      path: "/test/custom",
      body: { name: "a", age: 25 },
      expectedCustom: true,
    },
    {
      name: "自定义错误处理器 - 年龄太小",
      path: "/test/custom",
      body: { name: "张三", age: 16 },
      expectedCustom: true,
    },
    {
      name: "默认错误处理器 - 姓名太短",
      path: "/test/default",
      body: { name: "a", age: 25 },
      expectedCustom: false,
    },
    {
      name: "默认错误处理器 - 年龄太小",
      path: "/test/default",
      body: { name: "张三", age: 16 },
      expectedCustom: false,
    },
  ];

  let successCount = 0;
  let totalCount = testCases.length;

  for (const testCase of testCases) {
    console.log(`📡 测试: ${testCase.name}`);

    const req = new Request(`http://localhost${testCase.path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testCase.body),
    });

    try {
      const response = await server.fetch(req);
      const data = await response.json();

      if (response.status === 400) {
        // 验证错误响应
        if (testCase.expectedCustom) {
          if (data.customError && data.customError === true) {
            console.log(`   ✅ 自定义错误处理器工作正常:`, data);
            successCount++;
          } else {
            console.log(`   ❌ 期望自定义错误处理器，但得到:`, data);
          }
        } else {
          if (!data.customError) {
            console.log(`   ✅ 默认错误处理器工作正常:`, data);
            successCount++;
          } else {
            console.log(`   ❌ 期望默认错误处理器，但得到:`, data);
          }
        }
      } else {
        console.log(`   ❌ 期望400状态码，但得到: ${response.status}`);
      }
    } catch (error) {
      console.log(`   ❌ 请求失败:`, error);
    }

    console.log("");
  }

  console.log(`🎉 自定义验证错误处理器测试完成! 成功: ${successCount}/${totalCount}`);
  console.log(`📊 成功率: ${((successCount / totalCount) * 100).toFixed(1)}%`);
}

// 执行测试
testCustomValidationErrors();

export default {
  fetch: (req: Request) => server.fetch(req),
};
