import type {
  ComponentRoute,
  NestedComponentRoute,
  FlattenedComponentRoute,
} from "../types/component-route";
import { flattenComponentRoutes } from "../middleware/component-router";
import { BaseServer } from "./base-server";
import { PathMatcher } from "../utils/path-matcher";
import { HtmlRenderer } from "../utils/html-renderer";
import { DependencyManager } from "../utils/dependency-manager";

/**
 * 组件路由服务器
 * 专门处理声明式组件路由
 */
export class ComponentServer extends BaseServer {
  private routes: FlattenedComponentRoute[];
  private dependencyManager: DependencyManager;

  constructor(routes: (ComponentRoute | NestedComponentRoute)[]) {
    super();
    this.routes = flattenComponentRoutes(routes);
    this.dependencyManager = new DependencyManager();

    // 检测路由冲突
    this.detectRouteConflicts(this.routes);
    this.logFlattenedRoutes(this.routes, "组件路由");
    console.log("🚀 依赖按需加载，服务器启动完成");
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
      if (PathMatcher.matchPath(route.fullPath, pathname)) {
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
        params: PathMatcher.extractParams(matchedRoute.fullPath, pathname),
        query: Object.fromEntries(url.searchParams),
        pathname,
      };

      // 执行中间件链，中间件会处理组件渲染
      return await this.executeMiddlewareChain(
        matchedRoute.middlewareChain,
        context,
        matchedRoute.component,
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
    componentImport: () => Promise<any>,
  ): Promise<Response> {
    // 创建最终的渲染函数
    const renderComponent = async () => {
      const componentModule = await componentImport();
      const component = componentModule.default || componentModule;

      // 自动检测组件类型
      const componentType =
        this.dependencyManager.detectComponentType(component);

      // 按需加载依赖
      const deps = await this.dependencyManager.getFrameworkDeps(componentType);

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
  private async renderVueComponent(
    component: any,
    context: any,
    deps: any,
  ): Promise<Response> {
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
      const fullHtml = HtmlRenderer.generateVueHtml(html, context);

      return new Response(fullHtml, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    } catch (error) {
      console.error("Vue 组件渲染失败:", error);
      return new Response("Vue Component Render Error", { status: 500 });
    }
  }

  /**
   * 渲染 React 组件
   */
  private async renderReactComponent(
    component: any,
    context: any,
    deps: any,
  ): Promise<Response> {
    try {
      const [react, renderer] = deps;
      const content = react.createElement(component, {
        req: context.req,
        params: context.params || {},
        query: context.query || {},
      });

      const html = renderer.renderToString(content);
      const fullHtml = HtmlRenderer.generateReactHtml(html, context);

      return new Response(fullHtml, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    } catch (error) {
      console.error("React 组件渲染失败:", error);
      return new Response("React Component Render Error", { status: 500 });
    }
  }

  /**
   * 获取依赖管理器（用于外部访问）
   */
  getDependencyManager(): DependencyManager {
    return this.dependencyManager;
  }
}
