import type { Middleware } from "../types";

/**
 * 服务器基类
 * 包含所有服务器类型的公共逻辑
 */
export abstract class BaseServer {
  protected globalMiddleware: Middleware[] = [];

  use(mw: Middleware) {
    this.globalMiddleware.push(mw);
    // 子类可以重写此方法以处理中间件变更
    this.onMiddlewareChange?.();
  }

  /** 中间件变更回调（子类实现） */
  protected onMiddlewareChange?(): void;

  /**
   * 打印扁平化后的路由信息，用于调试
   */
  protected logFlattenedRoutes(routes: any[], type: string = "路由"): void {
    console.log(`🚀 扁平化后的${type}:`);
    for (const route of routes) {
      const method = route.method || "GET";
      const path = route.fullPath || route.path;
      console.log(`  ${method} ${path}`);
      if (route.middlewareChain && route.middlewareChain.length > 0) {
        console.log(`    中间件链: ${route.middlewareChain.length} 个`);
      }
    }
    console.log("");
  }

  /**
   * 检测路由冲突
   * 检查是否有路径相同但方法不同的路由，以及潜在的路径冲突
   */
  protected detectRouteConflicts(routes: any[]): void {
    const pathGroups = new Map<string, any[]>();

    // 按路径分组
    for (const route of routes) {
      const path = route.fullPath || route.path;
      const method = route.method || "GET";
      if (!pathGroups.has(path)) {
        pathGroups.set(path, []);
      }
      pathGroups.get(path)!.push({ ...route, method });
    }

    // 检查冲突
    for (const [path, routeList] of pathGroups) {
      if (routeList.length > 1) {
        const methods = routeList.map((r) => r.method);
        const uniqueMethods = [...new Set(methods)];

        if (uniqueMethods.length === 1) {
          // 相同路径、相同方法 - 这是冲突！
          console.warn(
            `⚠️  路由冲突: ${uniqueMethods[0]} ${path} 定义了 ${routeList.length} 次`
          );
          routeList.forEach((route, index) => {
            console.warn(`   ${index + 1}. ${route.method} ${path}`);
          });
        } else {
          // 相同路径、不同方法 - 这是正常的
          console.log(`ℹ️  路径 ${path} 支持方法: ${uniqueMethods.join(", ")}`);
        }
      }
    }

    // 检查潜在的路径冲突（动态路由可能冲突）
    this.detectDynamicRouteConflicts(routes);
  }

  /**
   * 检测动态路由的潜在冲突
   */
  private detectDynamicRouteConflicts(routes: any[]): void {
    const dynamicRoutes = routes.filter((r) => {
      const path = r.fullPath || r.path;
      return path.includes(":") || path.includes("*");
    });

    for (let i = 0; i < dynamicRoutes.length; i++) {
      for (let j = i + 1; j < dynamicRoutes.length; j++) {
        const route1 = dynamicRoutes[i];
        const route2 = dynamicRoutes[j];
        const method1 = route1.method || "GET";
        const method2 = route2.method || "GET";

        if (method1 === method2) {
          const path1 = route1.fullPath || route1.path;
          const path2 = route2.fullPath || route2.path;
          // 检查路径是否可能冲突
          if (this.pathsMayConflict(path1, path2)) {
            console.warn(
              `⚠️  潜在路由冲突: ${method1} ${path1} 可能与 ${path2} 冲突`
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
    path: string
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
