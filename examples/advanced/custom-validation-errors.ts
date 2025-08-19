import { Type } from "@sinclair/typebox";
import { Server, json, withExtra } from "../src/index";
import type { ValidationErrorHandler } from "../src/utils/route-handler-factory";
import type { Route } from "../src/types";

// 定义验证Schema
const UserSchema = Type.Object({
  name: Type.String({ minLength: 2, maxLength: 50 }),
  age: Type.Number({ minimum: 0, maximum: 150 }),
  email: Type.String({ format: "email" }),
});

const QuerySchema = Type.Object({
  page: Type.Optional(Type.Number({ minimum: 1 })),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100 })),
});

// 自定义验证错误处理器 - 中文友好格式
const chineseValidationErrorHandler: ValidationErrorHandler = (error, field, value, schema) => {
  // 根据字段名提供中文错误信息
  const fieldNames: Record<string, string> = {
    name: "姓名",
    age: "年龄",
    email: "邮箱",
    page: "页码",
    limit: "限制数量",
  };

  const fieldName = fieldNames[field] || field;

  // 根据错误类型提供具体建议
  let suggestion = "";
  if (field === "name") {
    suggestion = "姓名长度应在2-50个字符之间";
  } else if (field === "age") {
    suggestion = "年龄应在0-150之间";
  } else if (field === "email") {
    suggestion = "请输入有效的邮箱地址";
  } else if (field === "page") {
    suggestion = "页码必须大于0";
  } else if (field === "limit") {
    suggestion = "限制数量应在1-100之间";
  }

  return json(
    {
      success: false,
      code: "VALIDATION_ERROR",
      message: `${fieldName}验证失败`,
      field,
      fieldName,
      suggestion,
      receivedValue: value,
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    },
    400
  );
};

// 自定义验证错误处理器 - 国际化格式
const internationalValidationErrorHandler: ValidationErrorHandler = (
  error,
  field,
  value,
  schema
) => {
  const fieldInfo = {
    name: { en: "Name", zh: "姓名", ja: "名前" },
    age: { en: "Age", zh: "年龄", ja: "年齢" },
    email: { en: "Email", zh: "邮箱", ja: "メール" },
    page: { en: "Page", zh: "页码", ja: "ページ" },
    limit: { en: "Limit", zh: "限制数量", ja: "制限" },
  };

  const fieldName = fieldInfo[field as keyof typeof fieldInfo] || {
    en: field,
    zh: field,
    ja: field,
  };

  return json(
    {
      success: false,
      error: "Validation Error",
      field,
      fieldNames: fieldName,
      message: error.message,
      receivedValue: value,
      timestamp: new Date().toISOString(),
      locale: "en", // 可以根据Accept-Language头动态设置
    },
    400
  );
};

// 自定义验证错误处理器 - 开发者友好格式
const developerValidationErrorHandler: ValidationErrorHandler = (error, field, value, schema) => {
  return json(
    {
      success: false,
      error: "Validation Error",
      field,
      message: error.message,
      receivedValue: value,
      expectedSchema: schema,
      validationRules: extractValidationRules(schema),
      suggestions: generateSuggestions(field, value, schema),
      timestamp: new Date().toISOString(),
      debug: {
        errorType: error.constructor.name,
        errorStack: error.stack,
        fieldPath: field,
      },
    },
    400
  );
};

// 提取验证规则的辅助函数
function extractValidationRules(schema: any): any {
  if (!schema) return {};

  // 这里可以根据实际的Schema结构提取规则
  // 例如从TypeBox Schema中提取minLength, maxLength等
  return {
    type: schema.type || "unknown",
    // 可以添加更多规则提取逻辑
  };
}

// 生成建议的辅助函数
function generateSuggestions(field: string, value: any, schema: any): string[] {
  const suggestions: string[] = [];

  if (field === "name") {
    if (typeof value === "string") {
      if (value.length < 2) suggestions.push("姓名至少需要2个字符");
      if (value.length > 50) suggestions.push("姓名不能超过50个字符");
    }
  } else if (field === "age") {
    if (typeof value === "number") {
      if (value < 0) suggestions.push("年龄不能为负数");
      if (value > 150) suggestions.push("年龄不能超过150");
    }
  } else if (field === "email") {
    suggestions.push("请检查邮箱格式是否正确");
    suggestions.push("常见格式: user@example.com");
  }

  return suggestions;
}

// 创建路由
const routes: Route[] = [
  // 使用中文错误处理器
  {
    method: "POST",
    path: "/users/chinese",
    handler: withExtra()(
      {
        body: UserSchema,
        validationErrorHandler: chineseValidationErrorHandler,
      },
      ({ body }) => {
        return json({
          success: true,
          message: "用户创建成功",
          user: body,
        });
      }
    ),
  },

  // 使用国际化错误处理器
  {
    method: "POST",
    path: "/users/international",
    handler: withExtra()(
      {
        body: UserSchema,
        validationErrorHandler: internationalValidationErrorHandler,
      },
      ({ body }) => {
        return json({
          success: true,
          message: "User created successfully",
          user: body,
        });
      }
    ),
  },

  // 使用开发者友好错误处理器
  {
    method: "POST",
    path: "/users/developer",
    handler: withExtra()(
      {
        body: UserSchema,
        validationErrorHandler: developerValidationErrorHandler,
      },
      ({ body }) => {
        return json({
          success: true,
          message: "User created successfully",
          user: body,
        });
      }
    ),
  },

  // 使用默认错误处理器
  {
    method: "POST",
    path: "/users/default",
    handler: withExtra()(
      {
        body: UserSchema,
        // 不指定validationErrorHandler，使用默认处理器
      },
      ({ body }) => {
        return json({
          success: true,
          message: "User created successfully",
          user: body,
        });
      }
    ),
  },

  // 带查询参数的示例
  {
    method: "GET",
    path: "/users",
    handler: withExtra()(
      {
        query: QuerySchema,
        validationErrorHandler: chineseValidationErrorHandler,
      },
      ({ query }) => {
        return json({
          success: true,
          message: "用户列表获取成功",
          query,
        });
      }
    ),
  },
];

const server = new Server(routes);

console.log("🚀 自定义验证错误处理器示例服务器启动");
console.log("📋 可用端点:");
console.log("  POST /users/chinese      - 中文错误格式");
console.log("  POST /users/international - 国际化错误格式");
console.log("  POST /users/developer    - 开发者友好格式");
console.log("  POST /users/default      - 默认错误格式");
console.log("  GET  /users              - 查询参数验证");

export default {
  fetch: (req: Request) => server.fetch(req),
};
