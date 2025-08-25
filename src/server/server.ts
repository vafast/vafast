import type {
  Handler,
  Middleware,
  Route,
  NestedRoute,
  FlattenedRoute,
} from "../types";
import { matchPath, flattenNestedRoutes } from "../router";
import { composeMiddleware } from "../middleware";
import { json } from "../utils/response";
import { BaseServer } from "./base-server";
import { PathMatcher } from "../utils/path-matcher";

export class Server extends BaseServer {
  private routes: FlattenedRoute[];

  constructor(routes: (Route | NestedRoute)[]) {
    super();
    // 扁平化嵌套路由，计算完整的中间件链
    this.routes = flattenNestedRoutes(routes);

    // 在构造时按路由"特异性"排序：静态 > 动态(:param) > 通配符(*)
    this.routes = this.routes.sort(
      (a, b) =>
        PathMatcher.calculatePathScore(b.fullPath) -
        PathMatcher.calculatePathScore(a.fullPath)
    );

    // 检测路由冲突
    this.detectRouteConflicts(this.routes);

    // 打印扁平化后的路由信息
    this.logFlattenedRoutes(this.routes);
  }

  fetch = async (req: Request): Promise<Response> => {
    const { pathname } = new URL(req.url);
    const method = req.method;

    // 自动处理 OPTIONS 请求
    if (method === "OPTIONS") {
      return this.handleOptions(pathname, this.routes);
    }

    let matched: FlattenedRoute | undefined;
    let params: Record<string, string> = {};
    let availableMethods: string[] = [];

    for (const route of this.routes) {
      const result = matchPath(route.fullPath, pathname);
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
        return await matched.handler(req);
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

    const middlewareChain = matched?.middlewareChain
      ? [...this.globalMiddleware, ...matched.middlewareChain]
      : this.globalMiddleware;

    // 使用 composeMiddleware 来确保错误处理中间件被应用
    const composedHandler = composeMiddleware(middlewareChain, handler);
    return await composedHandler(req);
  };
}
