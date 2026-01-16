/**
 * Vafast 核心服务器
 *
 * 基于 Radix Tree 的高性能路由匹配
 * 时间复杂度: O(k)，k 为路径段数
 */

import type { Method, Middleware } from "../types";
import type { ProcessedRoute } from "../defineRoute";
import { composeMiddleware } from "../middleware";
import { json } from "../utils/response";
import { BaseServer } from "./base-server";
import { RadixRouter } from "../router/radix-tree";
import { RouteRegistry, setGlobalRegistry } from "../utils/route-registry";

/**
 * Vafast 服务器
 *
 * @example
 * ```typescript
 * const routes = defineRoutes([
 *   defineRoute({ method: "GET", path: "/", handler: () => "Hello" }),
 * ])
 * const server = new Server(routes)
 * export default { fetch: server.fetch }
 * ```
 */
export class Server extends BaseServer {
  private router: RadixRouter;
  private routes: ProcessedRoute[];

  constructor(routes: readonly ProcessedRoute[] = []) {
    super();
    this.router = new RadixRouter();
    this.routes = [];

    if (routes.length > 0) {
      this.registerRoutes([...routes]);
    }
  }

  private registerRoutes(routes: ProcessedRoute[]): void {
    this.routes.push(...routes);

    for (const route of routes) {
      this.router.register(
        route.method as Method,
        route.path,
        route.handler,
        (route.middleware || []) as Middleware[],
      );
    }

    this.detectRouteConflicts(routes);
    this.logRoutes(routes);

    // 自动设置全局 RouteRegistry
    setGlobalRegistry(new RouteRegistry(this.routes));
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

  /** 生成 404/405 响应 */
  private createErrorResponse(method: string, pathname: string): Response {
    const allowedMethods = this.router.getAllowedMethods(pathname);
    if (allowedMethods.length > 0) {
      return json(
        {
          code: 405,
          message: `Method ${method} not allowed for this endpoint`,
          allowedMethods,
        },
        405,
        { Allow: allowedMethods.join(", ") },
      );
    }
    return json({ code: 404, message: "Not Found" }, 404);
  }

  /** 处理请求 */
  fetch = async (req: Request): Promise<Response> => {
    const pathname = this.extractPathname(req.url);
    const method = req.method as Method;

    const match = this.router.match(method, pathname);

    if (match) {
      (req as unknown as Record<string, unknown>).params = match.params;

      // 运行时组合中间件
      const allMiddleware = [...this.globalMiddleware, ...match.middleware];
      const handler = composeMiddleware(allMiddleware, match.handler);

      return handler(req);
    }

    // OPTIONS 预检请求特殊处理：查找同路径其他方法的路由，使用其中间件
    // 这允许路由级 CORS 中间件正常工作
    if (method === "OPTIONS") {
      const allowedMethods = this.router.getAllowedMethods(pathname);
      if (allowedMethods.length > 0) {
        // 尝试获取该路径任意方法的路由中间件
        const anyMatch = this.router.match(
          allowedMethods[0] as Method,
          pathname,
        );
        const routeMiddleware = anyMatch?.middleware || [];
        const allMiddleware = [...this.globalMiddleware, ...routeMiddleware];

        // OPTIONS 请求默认返回 204（中间件如 CORS 可能会提前响应）
        const optionsHandler = () =>
          new Response(null, {
            status: 204,
            headers: { Allow: allowedMethods.join(", ") },
          });

        const handler = composeMiddleware(allMiddleware, optionsHandler);
        return handler(req);
      }
    }

    // 未匹配路由时，仍执行全局中间件（如 CORS 处理 OPTIONS 预检）
    if (this.globalMiddleware.length > 0) {
      const handler = composeMiddleware(this.globalMiddleware, () =>
        this.createErrorResponse(method, pathname),
      );
      return handler(req);
    }

    return this.createErrorResponse(method, pathname);
  };

  /** 动态添加单个路由 */
  addRoute(route: ProcessedRoute): void {
    this.routes.push(route);
    this.router.register(
      route.method as Method,
      route.path,
      route.handler,
      (route.middleware || []) as Middleware[],
    );
  }

  /** 动态添加多个路由 */
  addRoutes(routes: readonly ProcessedRoute[]): void {
    this.registerRoutes([...routes]);
  }

  /** 获取路由列表 */
  getRoutes(): Array<{ method: Method; path: string }> {
    return this.router.getRoutes();
  }

  /**
   * 获取完整的路由元信息
   *
   * 用于 API 文档生成、Webhook 事件注册、权限检查等场景
   */
  getRoutesWithMeta(): ProcessedRoute[] {
    return this.routes;
  }
}
