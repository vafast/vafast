/**
 * Vafast 核心服务器
 *
 * 基于 Radix Tree 的高性能路由匹配
 * 时间复杂度: O(k)，k 为路径段数
 *
 * @author Framework Team
 * @version 2.0.0
 * @license MIT
 */

import type {
  Handler,
  Middleware,
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
 * 使用 Radix Tree 实现高性能路由匹配
 * 运行时无关设计，支持 Bun、Deno、Node.js 等
 *
 * @example
 * ```typescript
 * import { Server, createHandler } from "vafast";
 * import { Type } from "@sinclair/typebox";
 *
 * const server = new Server([
 *   {
 *     method: "GET",
 *     path: "/",
 *     handler: () => new Response("Hello World"),
 *   },
 *   {
 *     method: "POST",
 *     path: "/users",
 *     handler: createHandler({
 *       body: Type.Object({ name: Type.String() })
 *     })(({ body }) => ({ id: 1, name: body.name })),
 *   },
 * ]);
 *
 * // 导出 fetch 方法供运行时使用
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

    // 初始化路由
    if (routes.length > 0) {
      this.registerRoutes(routes);
    }
  }

  /**
   * 注册路由
   */
  private registerRoutes(routes: (Route | NestedRoute)[]): void {
    // 扁平化嵌套路由
    const flattened = flattenNestedRoutes(routes);
    this.routes.push(...flattened);

    // 注册到 Radix Tree
    for (const route of flattened) {
      this.router.register(
        route.method as Method,
        route.fullPath,
        route.handler,
        route.middlewareChain || []
      );
    }

    // 检测路由冲突
    this.detectRouteConflicts(flattened);

    // 打印路由信息
    this.logFlattenedRoutes(flattened);
  }

  /**
   * 处理请求
   */
  fetch = async (req: Request): Promise<Response> => {
    const { pathname } = new URL(req.url);
    const method = req.method as Method;

    // O(k) 路由匹配
    const match = this.router.match(method, pathname);

    if (match) {
      // 注入路径参数
      (req as unknown as Record<string, unknown>).params = match.params;

      // 组合中间件链
      const middlewareChain = [...this.globalMiddleware, ...match.middleware];
      const composedHandler = composeMiddleware(middlewareChain, match.handler);

      return composedHandler(req);
    }

    // 检查是否是方法不允许
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
        { Allow: allowedMethods.join(", ") }
      );
    }

    // 路径不存在
    return json({ success: false, error: "Not Found" }, 404);
  };

  /**
   * 添加单个路由
   */
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
      route.middleware || []
    );
  }

  /**
   * 批量添加路由
   */
  addRoutes(routes: (Route | NestedRoute)[]): void {
    this.registerRoutes(routes);
  }

  /**
   * 获取所有已注册的路由
   */
  getRoutes(): Array<{ method: Method; path: string }> {
    return this.router.getRoutes();
  }

  /**
   * 获取路由器缓存统计
   */
  getCacheStats(): { size: number; maxSize: number } {
    return this.router.getCacheStats();
  }

  /**
   * 清除路由器缓存
   */
  clearCache(): void {
    this.router.clearCache();
  }
}
