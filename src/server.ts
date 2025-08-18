import type { Handler, Middleware } from "./types";
import { matchPath } from "./router";
import type { Route } from "./types";
import { composeMiddleware } from "./middleware";
import { json } from "./util";

export class Server {
  private routes: Route[];
  private globalMiddleware: Middleware[] = [];

  constructor(routes: Route[]) {
    // 在构造时按路由"特异性"排序：静态 > 动态(:param) > 通配符(*)
    const score = (path: string): number => {
      const parts = path.split("/").filter(Boolean);
      let s = 0;
      for (const p of parts) {
        if (p === "*") s += 1; // 最弱
        else if (p.startsWith(":")) s += 2; // 中等
        else s += 3; // 静态最强
      }
      // 更长的路径更具体，略微提升
      return s * 10 + parts.length;
    };

    this.routes = [...routes].sort((a, b) => score(b.path) - score(a.path));
  }

  use(mw: Middleware) {
    this.globalMiddleware.push(mw);
  }

  fetch = async (req: Request): Promise<Response> => {
    const { pathname } = new URL(req.url);
    const method = req.method;

    // 自动处理 OPTIONS 请求
    if (method === "OPTIONS") {
      return this.handleOptions(pathname);
    }

    let matched: Route | undefined;
    let params: Record<string, string> = {};
    let availableMethods: string[] = [];

    for (const route of this.routes) {
      const result = matchPath(route.path, pathname);
      if (result.matched) {
        if (route.method === method) {
          matched = route;
          params = result.params;
          break;
        } else {
          // 路径匹配但方法不匹配，收集可用方法
          availableMethods.push(route.method);
        }
      }
    }

    const handler: Handler = async (req) => {
      if (matched) {
        // 将路径参数设置到 req 对象上，以便 TypedRoute 处理器能够访问
        (req as any).params = params;
        return await matched.handler(req, params);
      } else if (availableMethods.length > 0) {
        // 路径存在但方法不匹配，返回 405 Method Not Allowed
        return json(
          {
            success: false,
            error: "Method Not Allowed",
            message: `Method ${method} not allowed for this endpoint`,
            allowedMethods: availableMethods,
          },
          405,
          {
            Allow: availableMethods.join(", "),
          }
        );
      } else {
        // 路径不存在，返回 404 Not Found
        return json({ success: false, error: "Not Found" }, 404);
      }
    };

    const middlewareChain = matched?.middleware
      ? [...this.globalMiddleware, ...matched.middleware]
      : this.globalMiddleware;

    // 使用 composeMiddleware 来确保错误处理中间件被应用
    const composedHandler = composeMiddleware(middlewareChain, handler);
    return await composedHandler(req);
  };

  // 处理 OPTIONS 请求
  private handleOptions(pathname: string): Response {
    const availableMethods: string[] = [];

    for (const route of this.routes) {
      const result = matchPath(route.path, pathname);
      if (result.matched) {
        availableMethods.push(route.method);
      }
    }

    // 去重并排序
    const uniqueMethods = [...new Set(availableMethods)].sort();

    return new Response(null, {
      status: 204,
      headers: {
        Allow: uniqueMethods.join(", "),
        "Access-Control-Allow-Methods": uniqueMethods.join(", "),
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }
}
