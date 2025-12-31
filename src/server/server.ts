/**
 * Vafast 核心服务器
 *
 * 基于 Radix Tree 的高性能路由匹配
 * 时间复杂度: O(k)，k 为路径段数
 */

import type {
  Handler,
  Route,
  NestedRoute,
  FlattenedRoute,
  Method,
} from "../types";
import { flattenNestedRoutes } from "../router";
import { composeMiddleware } from "../middleware";
import { json } from "../utils/response";
import { BaseServer } from "./base-server";
import { RadixRouter } from "../router/radix-tree";

/**
 * Vafast 服务器
 *
 * @example
 * ```typescript
 * const server = new Server([
 *   { method: "GET", path: "/", handler: () => new Response("Hello") },
 * ]);
 * export default { fetch: server.fetch };
 * ```
 */
export class Server extends BaseServer {
  private router: RadixRouter;
  private routes: FlattenedRoute[];

  constructor(routes: (Route | NestedRoute)[] = []) {
    super();
    this.router = new RadixRouter();
    this.routes = [];

    if (routes.length > 0) {
      this.registerRoutes(routes);
    }
  }

  private registerRoutes(routes: (Route | NestedRoute)[]): void {
    const flattened = flattenNestedRoutes(routes);
    this.routes.push(...flattened);

    for (const route of flattened) {
      this.router.register(
        route.method as Method,
        route.fullPath,
        route.handler,
        route.middlewareChain || [],
      );
    }

    this.detectRouteConflicts(flattened);
    this.logFlattenedRoutes(flattened);
  }

  /** 快速提取 pathname */
  private extractPathname(url: string): string {
    let start = url.indexOf("://");
    start = start === -1 ? 0 : start + 3;

    const pathStart = url.indexOf("/", start);
    if (pathStart === -1) return "/";

    let end = url.indexOf("?", pathStart);
    if (end === -1) end = url.indexOf("#", pathStart);
    if (end === -1) end = url.length;

    return url.substring(pathStart, end) || "/";
  }

  /** 处理请求 */
  fetch = async (req: Request): Promise<Response> => {
    const pathname = this.extractPathname(req.url);
    const method = req.method as Method;

    const match = this.router.match(method, pathname);

    if (match) {
      (req as unknown as Record<string, unknown>).params = match.params;

      // 组合全局中间件 + 路由中间件（mapResponse 在 composeMiddleware 内部处理）
      const allMiddleware = [...this.globalMiddleware, ...match.middleware];
      const handler = composeMiddleware(allMiddleware, match.handler);

      return handler(req);
    }

    // 405 Method Not Allowed
    const allowedMethods = this.router.getAllowedMethods(pathname);
    if (allowedMethods.length > 0) {
      return json(
        {
          success: false,
          error: "Method Not Allowed",
          message: `Method ${method} not allowed for this endpoint`,
          allowedMethods,
        },
        405,
        { Allow: allowedMethods.join(", ") },
      );
    }

    // 404 Not Found
    return json({ success: false, error: "Not Found" }, 404);
  };

  addRoute(route: Route): void {
    const flattenedRoute: FlattenedRoute = {
      ...route,
      fullPath: route.path,
      middlewareChain: route.middleware || [],
    };

    this.routes.push(flattenedRoute);
    this.router.register(
      route.method as Method,
      route.path,
      route.handler,
      route.middleware || [],
    );
  }

  addRoutes(routes: (Route | NestedRoute)[]): void {
    this.registerRoutes(routes);
  }

  getRoutes(): Array<{ method: Method; path: string }> {
    return this.router.getRoutes();
  }
}
