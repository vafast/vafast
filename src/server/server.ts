/**
 * Vafast 核心服务器
 *
 * 基于 Radix Tree 的高性能路由匹配
 * 时间复杂度: O(k)，k 为路径段数
 */

import type { Route, NestedRoute, FlattenedRoute, Method } from "../types";
import { flattenNestedRoutes } from "../router";
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
 * const server = new Server([
 *   { method: "GET", path: "/", handler: () => new Response("Hello") },
 * ]);
 * export default { fetch: server.fetch };
 * ```
 */
export class Server extends BaseServer {
  private router: RadixRouter;
  private routes: FlattenedRoute[];
  /** 是否已预编译 */
  private isCompiled = false;
  /** 预编译时的全局中间件数量 */
  private compiledWithMiddlewareCount = 0;

  constructor(routes: (Route | NestedRoute)[] = []) {
    super();
    this.router = new RadixRouter();
    this.routes = [];

    // 设置中间件编译器
    this.router.setCompiler((middleware, handler) =>
      composeMiddleware(middleware, handler),
    );

    if (routes.length > 0) {
      this.registerRoutes(routes);
    }
  }

  /**
   * 预编译所有路由处理链
   * 在添加所有路由和全局中间件后调用，可提升运行时性能
   */
  compile(): this {
    this.router.precompileAll(this.globalMiddleware);
    this.isCompiled = true;
    this.compiledWithMiddlewareCount = this.globalMiddleware.length;
    return this;
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

    // 自动预编译（如果没有全局中间件）
    if (this.globalMiddleware.length === 0 && !this.isCompiled) {
      this.compile();
    }

    // 自动设置全局 RouteRegistry（支持在任意位置通过 getRouteRegistry() 访问）
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
          success: false,
          error: "Method Not Allowed",
          message: `Method ${method} not allowed for this endpoint`,
          allowedMethods,
        },
        405,
        { Allow: allowedMethods.join(", ") },
      );
    }
    return json({ success: false, error: "Not Found" }, 404);
  }

  /** 处理请求 */
  fetch = async (req: Request): Promise<Response> => {
    const pathname = this.extractPathname(req.url);
    const method = req.method as Method;

    const match = this.router.match(method, pathname);

    if (match) {
      (req as unknown as Record<string, unknown>).params = match.params;

      // 优先使用预编译的处理链（仅当全局中间件未变化时）
      if (
        match.compiled &&
        this.globalMiddleware.length === this.compiledWithMiddlewareCount
      ) {
        return match.compiled(req);
      }

      // 回退：运行时组合中间件
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

  /**
   * 获取完整的路由元信息（不含 handler 和 middleware）
   *
   * 用于 API 文档生成、Webhook 事件注册、权限检查等场景
   *
   * @example
   * ```typescript
   * const routes = server.getRoutesWithMeta()
   * for (const route of routes) {
   *   console.log(route.fullPath, route.name, route.description)
   * }
   * ```
   */
  getRoutesWithMeta(): FlattenedRoute[] {
    return this.routes;
  }
}
