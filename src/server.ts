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

    // 检测路由冲突
    this.detectRouteConflicts();
  }

  use(mw: Middleware) {
    this.globalMiddleware.push(mw);
  }

  /**
   * 检测路由冲突
   * 检查是否有路径相同但方法不同的路由，以及潜在的路径冲突
   */
  private detectRouteConflicts(): void {
    const pathGroups = new Map<string, Route[]>();

    // 按路径分组
    for (const route of this.routes) {
      const path = route.path;
      if (!pathGroups.has(path)) {
        pathGroups.set(path, []);
      }
      pathGroups.get(path)!.push(route);
    }

    // 检查冲突
    for (const [path, routes] of pathGroups) {
      if (routes.length > 1) {
        const methods = routes.map((r) => r.method);
        const uniqueMethods = [...new Set(methods)];

        if (uniqueMethods.length === 1) {
          // 相同路径、相同方法 - 这是冲突！
          console.warn(`⚠️  路由冲突: ${uniqueMethods[0]} ${path} 定义了 ${routes.length} 次`);
          routes.forEach((route, index) => {
            console.warn(`   ${index + 1}. ${route.method} ${route.path}`);
          });
        } else {
          // 相同路径、不同方法 - 这是正常的
          console.log(`ℹ️  路径 ${path} 支持方法: ${uniqueMethods.join(", ")}`);
        }
      }
    }

    // 检查潜在的路径冲突（动态路由可能冲突）
    this.detectDynamicRouteConflicts();
  }

  /**
   * 检测动态路由的潜在冲突
   */
  private detectDynamicRouteConflicts(): void {
    const dynamicRoutes = this.routes.filter((r) => r.path.includes(":") || r.path.includes("*"));

    for (let i = 0; i < dynamicRoutes.length; i++) {
      for (let j = i + 1; j < dynamicRoutes.length; j++) {
        const route1 = dynamicRoutes[i];
        const route2 = dynamicRoutes[j];

        if (route1.method === route2.method) {
          // 检查路径是否可能冲突
          if (this.pathsMayConflict(route1.path, route2.path)) {
            console.warn(
              `⚠️  潜在路由冲突: ${route1.method} ${route1.path} 可能与 ${route2.path} 冲突`
            );
          }
        }
      }
    }
  }

  /**
   * 判断两个路径是否可能冲突
   */
  private pathsMayConflict(path1: string, path2: string): boolean {
    const parts1 = path1.split("/").filter(Boolean);
    const parts2 = path2.split("/").filter(Boolean);

    if (parts1.length !== parts2.length) return false;

    for (let i = 0; i < parts1.length; i++) {
      const p1 = parts1[i];
      const p2 = parts2[i];

      // 如果两个部分都是静态的且不同，则不会冲突
      if (
        !p1.startsWith(":") &&
        !p1.startsWith("*") &&
        !p2.startsWith(":") &&
        !p2.startsWith("*") &&
        p1 !== p2
      ) {
        return false;
      }

      // 如果一个是通配符，另一个是动态参数，可能冲突
      if ((p1 === "*" && p2.startsWith(":")) || (p2 === "*" && p1.startsWith(":"))) {
        return true;
      }
    }

    return false;
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
