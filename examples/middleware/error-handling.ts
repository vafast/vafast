import { Server } from "../../src";
import { defineRoute, defineRoutes } from "../../src/defineRoute";
import { VafastError } from "../../src/middleware";

// 错误处理示例 - 符合 Vafast 文档风格
const routes = defineRoutes([
  defineRoute({
    method: "GET",
    path: "/",
    handler: (req) => {
      const name = new URL(req.url).searchParams.get("name");
      if (!name) {
        throw new VafastError("缺少名称参数", {
          status: 400,
          type: "bad_request",
          expose: true,
        });
      }
      return new Response(`你好，${name}！`, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    },
  }),
  defineRoute({
    method: "POST",
    path: "/users",
    handler: async (req) => {
      try {
        const body = await req.json();
        const { name, email, age } = body;

        // 表单验证错误
        if (!name || !email) {
          throw new VafastError("缺少必填字段", {
            status: 400,
            type: "validation_error",
            expose: true,
          });
        }

        if (age && (age < 0 || age > 150)) {
          throw new VafastError("年龄必须在 0-150 之间", {
            status: 400,
            type: "validation_error",
            expose: true,
          });
        }

        // 模拟用户创建
        const user = { id: Date.now(), name, email, age: age || 18 };

        return new Response(
          JSON.stringify({
            message: "用户创建成功",
            user,
          }),
          {
            status: 201,
            headers: { "Content-Type": "application/json" },
          }
        );
      } catch (error) {
        if (error instanceof VafastError) {
          throw error; // 重新抛出 VafastError
        }

        // 处理其他错误
        throw new VafastError("用户创建失败", {
          status: 500,
          type: "internal_error",
          expose: false, // 不向客户端暴露内部错误
          cause: error,
        });
      }
    },
  }),
  defineRoute({
    method: "GET",
    path: "/admin",
    handler: (req) => {
      const role = req.headers.get("x-user-role");

      if (!role) {
        throw new VafastError("缺少用户角色", {
          status: 401,
          type: "unauthorized",
          expose: true,
        });
      }

      if (role !== "admin") {
        throw new VafastError("权限不足", {
          status: 403,
          type: "forbidden",
          expose: true,
        });
      }

      return new Response(
        JSON.stringify({
          message: "欢迎，管理员！",
          secret: "这是机密信息",
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    },
  }),
  defineRoute({
    method: "GET",
    path: "/data/:id",
    schema: {
      params: {} as { id: string },
    },
    handler: ({ params }) => {
      const id = params.id;

      if (!id) {
        throw new VafastError("缺少数据ID", {
          status: 400,
          type: "bad_request",
          expose: true,
        });
      }

      // 模拟数据查找
      if (id === "404") {
        throw new VafastError("数据不存在", {
          status: 404,
          type: "not_found",
          expose: true,
        });
      }

      if (id === "500") {
        throw new VafastError("服务器内部错误", {
          status: 500,
          type: "internal_error",
          expose: false, // 不向客户端暴露
        });
      }

      return new Response(
        JSON.stringify({
          id,
          message: "数据获取成功",
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    },
  }),
]);

const server = new Server(routes);

export default {
  fetch: (req: Request) => server.fetch(req),
};
