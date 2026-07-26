import {
  Server,
  defineRoute,
  defineRoutes,
  defineMiddleware,
  json,
  Type,
  isValidationFailedError,
} from "../../src/index";

const UserSchema = Type.Object({
  name: Type.String({ minLength: 2, maxLength: 50 }),
  age: Type.Number({ minimum: 0, maximum: 150 }),
  email: Type.String({ format: "email" }),
});

const QuerySchema = Type.Object({
  page: Type.Optional(Type.Number({ minimum: 1 })),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100 })),
});

const fieldNames: Record<string, string> = {
  name: "姓名",
  age: "年龄",
  email: "邮箱",
  page: "页码",
  limit: "限制数量",
};

/** 将框架默认的校验错误包装成中文友好响应 */
const chineseValidationErrors = defineMiddleware(async (_req, next) => {
  try {
    return await next();
  } catch (err) {
    if (!isValidationFailedError(err)) {
      throw err;
    }

    return json(
      {
        success: false,
        code: "VALIDATION_ERROR",
        message: "请求参数校验失败",
        details: err.details.map((detail) => ({
          location: detail.location,
          field: detail.field,
          fieldName: fieldNames[detail.field] ?? detail.field,
          message: detail.message,
          value: detail.value,
        })),
        timestamp: new Date().toISOString(),
      },
      err.status,
    );
  }
});

const routes = defineRoutes([
  defineRoute({
    method: "POST",
    path: "/users/chinese",
    schema: { body: UserSchema },
    middleware: [chineseValidationErrors],
    handler: ({ body }) =>
      json({
        success: true,
        message: "用户创建成功",
        user: body,
      }),
  }),

  defineRoute({
    method: "POST",
    path: "/users/default",
    schema: { body: UserSchema },
    handler: ({ body }) =>
      json({
        success: true,
        message: "User created successfully",
        user: body,
      }),
  }),

  defineRoute({
    method: "GET",
    path: "/users",
    schema: { query: QuerySchema },
    middleware: [chineseValidationErrors],
    handler: ({ query }) =>
      json({
        success: true,
        message: "用户列表获取成功",
        query,
      }),
  }),
]);

const server = new Server(routes);

console.log("🚀 自定义验证错误示例服务器");
console.log("📋 可用端点:");
console.log("  POST /users/chinese  - 中文包装的校验错误");
console.log("  POST /users/default  - 框架默认 422 details");
console.log("  GET  /users          - query 校验（中文包装）");

export default {
  fetch: (req: Request) => server.fetch(req),
};
