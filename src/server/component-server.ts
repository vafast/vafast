import type {
  ComponentRoute,
  NestedComponentRoute,
  FlattenedComponentRoute,
} from "../types/component-route";
import { flattenComponentRoutes } from "../middleware/component-router";

/**
 * 组件路由服务器
 * 专门处理声明式组件路由
 */
export class ComponentServer {
  private routes: FlattenedComponentRoute[];
  private globalMiddleware: any[] = [];

  constructor(routes: (ComponentRoute | NestedComponentRoute)[]) {
    this.routes = flattenComponentRoutes(routes);
    this.logFlattenedRoutes();
  }

  use(mw: any) {
    this.globalMiddleware.push(mw);
  }

  /**
   * 打印扁平化后的路由信息
   */
  private logFlattenedRoutes(): void {
    console.log("🚀 扁平化后的组件路由:");
    for (const route of this.routes) {
      console.log(`  GET ${route.fullPath}`);
      if (route.middlewareChain.length > 0) {
        console.log(`    中间件链: ${route.middlewareChain.length} 个`);
      }
    }
    console.log("");
  }

  /**
   * 处理请求
   */
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const pathname = url.pathname;
    const method = req.method;

    // 只支持 GET 请求
    if (method !== "GET") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    // 查找匹配的路由
    let matchedRoute: FlattenedComponentRoute | null = null;
    for (const route of this.routes) {
      if (this.matchPath(route.fullPath, pathname)) {
        matchedRoute = route;
        break;
      }
    }

    if (!matchedRoute) {
      return new Response("Not Found", { status: 404 });
    }

    try {
      // 创建中间件上下文
      const context = {
        req,
        params: this.extractParams(matchedRoute.fullPath, pathname),
        query: Object.fromEntries(url.searchParams),
        pathname,
      };

      // 执行中间件链，中间件会处理组件渲染
      return await this.executeMiddlewareChain(
        matchedRoute.middlewareChain,
        context,
        matchedRoute.component
      );
    } catch (error) {
      console.error("组件渲染失败:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  /**
   * 执行中间件链
   */
  private async executeMiddlewareChain(
    middlewareChain: any[],
    context: any,
    componentImport: () => Promise<any>
  ): Promise<Response> {
    // 创建最终的渲染函数
    const renderComponent = async () => {
      const componentModule = await componentImport();
      const component = componentModule.default || componentModule;

      // 中间件已经配置了渲染器，直接调用
      // 这里需要中间件提供渲染能力
      if ((context.req as any).renderVue) {
        return await (context.req as any).renderVue(() => Promise.resolve(component));
      } else if ((context.req as any).renderReact) {
        return await (context.req as any).renderReact(() => Promise.resolve(component));
      } else {
        throw new Error("没有配置渲染器中间件");
      }
    };

    // 执行中间件链
    let index = 0;
    const next = async (): Promise<Response> => {
      if (index >= middlewareChain.length) {
        return await renderComponent();
      }

      const middleware = middlewareChain[index++];
      return await middleware(context.req, next);
    };

    return await next();
  }

  /**
   * 路径匹配
   */
  private matchPath(pattern: string, path: string): boolean {
    const patternParts = pattern.split("/").filter(Boolean);
    const pathParts = path.split("/").filter(Boolean);

    if (patternParts.length !== pathParts.length) {
      return false;
    }

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i] !== pathParts[i] && !patternParts[i].startsWith(":")) {
        return false;
      }
    }

    return true;
  }

  /**
   * 提取路径参数
   */
  private extractParams(pattern: string, path: string): Record<string, string> {
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
