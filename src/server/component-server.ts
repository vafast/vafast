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

  // 按需加载的依赖缓存
  private dependencyCache = new Map<string, any>();

  constructor(routes: (ComponentRoute | NestedComponentRoute)[]) {
    this.routes = flattenComponentRoutes(routes);
    this.logFlattenedRoutes();
    console.log("🚀 依赖按需加载，服务器启动完成");
  }

  use(mw: any) {
    this.globalMiddleware.push(mw);
  }

  /**
   * 按需获取框架依赖
   */
  private async getFrameworkDeps(framework: "vue" | "react") {
    if (this.dependencyCache.has(framework)) {
      return this.dependencyCache.get(framework);
    }

    console.log(`📦 按需加载 ${framework} 依赖...`);

    try {
      let deps;
      switch (framework) {
        case "vue":
          deps = await Promise.all([import("vue"), import("@vue/server-renderer")]);
          break;
        case "react":
          deps = await Promise.all([import("react"), import("react-dom/server")]);
          break;
        default:
          throw new Error(`不支持的框架: ${framework}`);
      }

      this.dependencyCache.set(framework, deps);
      console.log(`✅ ${framework} 依赖加载完成`);
      return deps;
    } catch (error) {
      console.error(`❌ ${framework} 依赖加载失败:`, error);
      throw error;
    }
  }

  /**
   * 检测组件类型
   */
  private detectComponentType(component: any): "vue" | "react" {
    // 简单的组件类型检测
    if (component.render && typeof component.render === "function") {
      return "vue";
    }
    if (component.$$typeof) {
      return "react";
    }
    // 默认使用 Vue
    return "vue";
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

      // 自动检测组件类型
      const componentType = this.detectComponentType(component);

      // 按需加载依赖
      const deps = await this.getFrameworkDeps(componentType);

      // 根据组件类型渲染
      if (componentType === "vue") {
        return await this.renderVueComponent(component, context, deps);
      } else if (componentType === "react") {
        return await this.renderReactComponent(component, context, deps);
      } else {
        throw new Error(`不支持的组件类型: ${componentType}`);
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
   * 渲染 Vue 组件
   */
  private async renderVueComponent(component: any, context: any, deps: any): Promise<Response> {
    try {
      const [vue, renderer] = deps;
      const app = vue.createSSRApp(component);

      // 提供路由信息
      app.provide("routeInfo", {
        params: context.params || {},
        query: context.query || {},
        pathname: context.pathname,
      });

      const html = await renderer.renderToString(app);

      return new Response(
        `
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Vafast SSR App</title>
          </head>
          <body>
            <div id="app">${html}</div>
            <script>
              window.__ROUTE_INFO__ = {
                params: ${JSON.stringify(context.params || {})},
                query: ${JSON.stringify(context.query || {})},
                pathname: '${context.pathname}'
              };
            </script>
            <script type="module" src="/client.js"></script>
          </body>
        </html>
      `,
        {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }
      );
    } catch (error) {
      console.error("Vue 组件渲染失败:", error);
      return new Response("Vue Component Render Error", { status: 500 });
    }
  }

  /**
   * 渲染 React 组件
   */
  private async renderReactComponent(component: any, context: any, deps: any): Promise<Response> {
    try {
      const [react, renderer] = deps;
      const content = react.createElement(component, {
        req: context.req,
        params: context.params || {},
        query: context.query || {},
      });

      const html = renderer.renderToString(content);

      return new Response(
        `
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Vafast SSR App</title>
          </head>
          <body>
            <div id="root">${html}</div>
            <script>
              window.__ROUTE_INFO__ = {
                params: ${JSON.stringify(context.params || {})},
                query: ${JSON.stringify(context.query || {})},
                pathname: '${context.pathname}'
              };
            </script>
            <script type="module" src="/client.js"></script>
          </body>
        </html>
      `,
        {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }
      );
    } catch (error) {
      console.error("React 组件渲染失败:", error);
      return new Response("React Component Render Error", { status: 500 });
    }
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
