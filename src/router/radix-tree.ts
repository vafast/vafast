/**
 * Radix Tree 路由匹配器
 *
 * 高性能路由匹配实现，时间复杂度 O(k)，k 为路径段数
 *
 * 支持的路由模式:
 * - 静态路径: /users, /api/v1/health
 * - 动态参数: /users/:id, /posts/:postId/comments/:commentId
 * - 通配符: /files/*, /static/*filepath
 * 
 * 特性:
 * - 同一位置支持不同参数名（如 /sessions/:id 和 /sessions/:sessionId/messages）
 * - 参数名冲突时会发出警告，但不影响功能
 */

import type { Handler, Middleware, Method } from "../types";

/** 预编译的处理器类型 */
type CompiledHandler = (req: Request) => Promise<Response>;

/** 路由处理信息 */
interface RouteHandler {
  handler: Handler;
  middleware: Middleware[];
  /** 预编译后的完整处理链（包含中间件） */
  compiled?: CompiledHandler;
  /** 该路由的参数名列表（按顺序） */
  paramNames: string[];
}

/** Radix Tree 节点 */
interface RadixNode {
  path: string;
  children: Record<string, RadixNode>;
  paramChild?: RadixNode;
  wildcardChild?: RadixNode;
  /** 该位置的参数名（仅用于调试和警告） */
  paramName?: string;
  handlers: Record<Method, RouteHandler | undefined>;
}

/** 路由匹配结果 */
export interface MatchResult {
  handler: Handler;
  middleware: Middleware[];
  params: Record<string, string>;
  /** 预编译后的完整处理链 */
  compiled?: CompiledHandler;
}

/**
 * Radix Tree 路由器
 *
 * @example
 * ```typescript
 * const router = new RadixRouter();
 * router.register("GET", "/users/:id", handler);
 * const result = router.match("GET", "/users/123");
 * // result.params = { id: "123" }
 * 
 * // 支持同一位置使用不同参数名
 * router.register("PUT", "/sessions/:id", updateHandler);
 * router.register("GET", "/sessions/:sessionId/messages", messagesHandler);
 * // PUT /sessions/123 → params = { id: "123" }
 * // GET /sessions/123/messages → params = { sessionId: "123" }
 * ```
 */
export class RadixRouter {
  private root: RadixNode;

  constructor() {
    this.root = this.createNode("");
  }

  private createNode(path: string): RadixNode {
    return {
      path,
      children: Object.create(null),
      handlers: Object.create(null),
    };
  }

  /** 分割路径 */
  private splitPath(path: string): string[] {
    return path.split("/").filter(Boolean);
  }

  /** 编译器函数 - 用于预编译中间件链 */
  private compiler?: (
    middleware: Middleware[],
    handler: Handler,
  ) => CompiledHandler;

  /** 设置中间件编译器 */
  setCompiler(
    compiler: (middleware: Middleware[], handler: Handler) => CompiledHandler,
  ): void {
    this.compiler = compiler;
  }

  /**
   * 从路由模式中提取参数名列表
   * @example "/users/:id/posts/:postId" → ["id", "postId"]
   */
  private extractParamNames(pattern: string): string[] {
    const paramNames: string[] = [];
    const segments = this.splitPath(pattern);
    
    for (const segment of segments) {
      if (segment[0] === ":") {
        paramNames.push(segment.substring(1));
      } else if (segment[0] === "*") {
        paramNames.push(segment.length > 1 ? segment.substring(1) : "*");
      }
    }
    
    return paramNames;
  }

  /** 注册路由 */
  register(
    method: Method,
    pattern: string,
    handler: Handler,
    middleware: Middleware[] = [],
  ): void {
    const segments = this.splitPath(pattern);
    const paramNames = this.extractParamNames(pattern);
    let node = this.root;

    for (const segment of segments) {
      const firstChar = segment[0];

      if (firstChar === ":") {
        // 动态参数节点
        const paramName = segment.substring(1);
        if (!node.paramChild) {
          node.paramChild = this.createNode(segment);
          node.paramChild.paramName = paramName;
        } else if (node.paramChild.paramName !== paramName) {
          // 参数名冲突警告（但不影响功能）
          console.warn(
            `⚠️  路由参数名冲突: 位置 "${node.path || '/'}" 下已有参数 ":${node.paramChild.paramName}"，` +
            `新路由使用 ":${paramName}"。建议使用一致的参数名。`
          );
        }
        node = node.paramChild;
      } else if (firstChar === "*") {
        // 通配符节点
        if (!node.wildcardChild) {
          node.wildcardChild = this.createNode(segment);
          node.wildcardChild.paramName =
            segment.length > 1 ? segment.substring(1) : "*";
        }
        node = node.wildcardChild;
        break;
      } else {
        // 静态路径节点
        if (!node.children[segment]) {
          node.children[segment] = this.createNode(segment);
        }
        node = node.children[segment];
      }
    }

    const routeHandler: RouteHandler = { handler, middleware, paramNames };

    // 如果没有全局中间件且设置了编译器，预编译处理链
    if (this.compiler && middleware.length === 0) {
      routeHandler.compiled = this.compiler([], handler);
    }

    node.handlers[method] = routeHandler;
  }

  /** 预编译所有路由（在添加全局中间件后调用） */
  precompileAll(globalMiddleware: Middleware[]): void {
    if (!this.compiler) return;
    this.precompileNode(this.root, globalMiddleware);
  }

  private precompileNode(
    node: RadixNode,
    globalMiddleware: Middleware[],
  ): void {
    for (const method in node.handlers) {
      const routeHandler = node.handlers[method as Method];
      if (routeHandler) {
        const allMiddleware = [...globalMiddleware, ...routeHandler.middleware];
        routeHandler.compiled = this.compiler!(
          allMiddleware,
          routeHandler.handler,
        );
      }
    }

    for (const key in node.children) {
      this.precompileNode(node.children[key], globalMiddleware);
    }

    if (node.paramChild) {
      this.precompileNode(node.paramChild, globalMiddleware);
    }

    if (node.wildcardChild) {
      this.precompileNode(node.wildcardChild, globalMiddleware);
    }
  }

  /** 匹配路由 */
  match(method: Method, path: string): MatchResult | null {
    const segments = this.splitPath(path);
    // 使用数组按位置收集参数值
    const paramValues: string[] = [];

    const node = this.matchNode(this.root, segments, 0, paramValues);
    if (!node) return null;

    const routeHandler = node.handlers[method];
    if (!routeHandler) return null;

    // 根据路由自己的 paramNames 构建 params 对象
    const params: Record<string, string> = Object.create(null);
    for (let i = 0; i < routeHandler.paramNames.length; i++) {
      params[routeHandler.paramNames[i]] = paramValues[i];
    }

    return {
      handler: routeHandler.handler,
      middleware: routeHandler.middleware,
      params,
      compiled: routeHandler.compiled,
    };
  }

  /** 递归匹配节点 (优先级: 静态 > 动态参数 > 通配符) */
  private matchNode(
    node: RadixNode,
    segments: string[],
    index: number,
    paramValues: string[],
  ): RadixNode | null {
    if (index === segments.length) {
      for (const method in node.handlers) {
        if (node.handlers[method as Method]) return node;
      }
      return null;
    }

    const segment = segments[index];

    // 1. 静态路径
    const staticChild = node.children[segment];
    if (staticChild) {
      const result = this.matchNode(staticChild, segments, index + 1, paramValues);
      if (result) return result;
    }

    // 2. 动态参数
    if (node.paramChild) {
      const valueIndex = paramValues.length;
      paramValues.push(segment);
      
      const result = this.matchNode(
        node.paramChild,
        segments,
        index + 1,
        paramValues,
      );

      if (result) return result;

      // 回溯：移除添加的参数值
      paramValues.length = valueIndex;
    }

    // 3. 通配符
    if (node.wildcardChild) {
      paramValues.push(segments.slice(index).join("/"));
      return node.wildcardChild;
    }

    return null;
  }

  /** 获取路径允许的 HTTP 方法 */
  getAllowedMethods(path: string): Method[] {
    const segments = this.splitPath(path);
    const node = this.findNode(segments);
    if (!node) return [];

    const methods: Method[] = [];
    for (const method in node.handlers) {
      if (node.handlers[method as Method]) {
        methods.push(method as Method);
      }
    }
    return methods;
  }

  /** 查找节点（不提取参数） */
  private findNode(segments: string[]): RadixNode | null {
    let node = this.root;

    for (const segment of segments) {
      if (node.children[segment]) {
        node = node.children[segment];
      } else if (node.paramChild) {
        node = node.paramChild;
      } else if (node.wildcardChild) {
        return node.wildcardChild;
      } else {
        return null;
      }
    }

    return node;
  }

  /** 获取所有已注册的路由 */
  getRoutes(): Array<{ method: Method; path: string }> {
    const routes: Array<{ method: Method; path: string }> = [];
    this.collectRoutes(this.root, "", routes);
    return routes;
  }

  private collectRoutes(
    node: RadixNode,
    prefix: string,
    routes: Array<{ method: Method; path: string }>,
  ): void {
    const currentPath = prefix + (node.path ? "/" + node.path : "");

    for (const method in node.handlers) {
      if (node.handlers[method as Method]) {
        routes.push({ method: method as Method, path: currentPath || "/" });
      }
    }

    for (const key in node.children) {
      this.collectRoutes(node.children[key], currentPath, routes);
    }

    if (node.paramChild) {
      this.collectRoutes(node.paramChild, currentPath, routes);
    }

    if (node.wildcardChild) {
      this.collectRoutes(node.wildcardChild, currentPath, routes);
    }
  }
}
