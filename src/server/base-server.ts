import type { Middleware } from "../types";

/**
 * 服务器基类
 * 包含所有服务器类型的公共逻辑
 */
export abstract class BaseServer {
  protected globalMiddleware: Middleware[] = [];

  use(mw: Middleware) {
    this.globalMiddleware.push(mw);
  }

  /**
   * 打印路由信息，用于调试
   */
  protected logRoutes(routes: any[], type: string = "路由"): void {
    console.log(`🚀 注册${type}:`);
    for (const route of routes) {
      const method = route.method || "GET";
      const path = route.path;
      console.log(`  ${method} ${path}`);
      if (route.middleware && route.middleware.length > 0) {
        console.log(`    中间件: ${route.middleware.length} 个`);
      }
    }
    console.log("");
  }

  /**
   * 检测路由冲突
   */
  protected detectRouteConflicts(routes: any[]): void {
    const pathGroups = new Map<string, any[]>();

    // 按路径分组
    for (const route of routes) {
      const path = route.path;
      const method = route.method || "GET";
      if (!pathGroups.has(path)) {
        pathGroups.set(path, []);
      }
      pathGroups.get(path)!.push({ ...route, method });
    }

    // 检查冲突
    for (const [path, routeList] of pathGroups) {
      if (routeList.length > 1) {
        const methods = routeList.map((r: { method: string }) => r.method);
        const uniqueMethods = [...new Set(methods)];

        if (uniqueMethods.length === 1) {
          console.warn(
            `⚠️  路由冲突: ${uniqueMethods[0]} ${path} 定义了 ${routeList.length} 次`,
          );
        }
      }
    }

    // 检查动态路由冲突
    this.detectDynamicRouteConflicts(routes);
  }

  /**
   * 检测动态路由冲突
   */
  private detectDynamicRouteConflicts(routes: any[]): void {
    const dynamicRoutes = routes.filter((r) => {
      return r.path.includes(":") || r.path.includes("*");
    });

    for (let i = 0; i < dynamicRoutes.length; i++) {
      for (let j = i + 1; j < dynamicRoutes.length; j++) {
        const route1 = dynamicRoutes[i];
        const route2 = dynamicRoutes[j];
        if (route1.method === route2.method && this.pathsMayConflict(route1.path, route2.path)) {
          console.warn(`⚠️  潜在路由冲突: ${route1.method} ${route1.path} 与 ${route2.path}`);
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
      if (
        (p1 === "*" && p2.startsWith(":")) ||
        (p2 === "*" && p1.startsWith(":"))
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * 路径匹配
   */
  protected matchPath(pattern: string, path: string): boolean {
    const patternParts = pattern.split("/").filter(Boolean);
    const pathParts = path.split("/").filter(Boolean);

    if (patternParts.length !== pathParts.length) {
      return false;
    }

    for (let i = 0; i < patternParts.length; i++) {
      if (
        patternParts[i] !== pathParts[i] &&
        !patternParts[i].startsWith(":")
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * 提取路径参数
   */
  protected extractParams(
    pattern: string,
    path: string,
  ): Record<string, string> {
    const params: Record<string, string> = {};
    const patternParts = pattern.split("/").filter(Boolean);
    const pathParts = path.split("/").filter(Boolean);

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(":")) {
        const paramName = patternParts[i].slice(1);
        params[paramName] = pathParts[i];
      }
    }

    return params;
  }
}
