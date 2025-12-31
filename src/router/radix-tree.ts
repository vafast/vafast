/**
 * Radix Tree 路由匹配器
 *
 * 高性能路由匹配实现，时间复杂度 O(k)，k 为路径段数
 * 相比线性匹配 O(n) 大幅提升性能
 *
 * 支持的路由模式:
 * - 静态路径: /users, /api/v1/health
 * - 动态参数: /users/:id, /posts/:postId/comments/:commentId
 * - 通配符: /files/*, /static/*filepath
 *
 * @author Framework Team
 * @version 2.0.0
 * @license MIT
 */

import type { Handler, Middleware, Method } from "../types";

/** 节点类型枚举 */
export const enum NodeType {
  STATIC = 0, // 静态路径 /users
  PARAM = 1, // 动态参数 :id
  WILDCARD = 2, // 通配符 * 或 *name
}

/** 路由处理信息 */
interface RouteHandler {
  handler: Handler;
  middleware: Middleware[];
  /** 预编译的组合处理器（包含中间件链），延迟编译 */
  composedHandler?: Handler;
}

/** Radix Tree 节点 */
interface RadixNode {
  /** 路径段 */
  path: string;
  /** 节点类型 */
  type: NodeType;
  /** 静态子节点（使用对象代替 Map，性能更好） */
  children: Record<string, RadixNode>;
  /** 动态参数子节点 (:param) */
  paramChild?: RadixNode;
  /** 通配符子节点 (* 或 *name) */
  wildcardChild?: RadixNode;
  /** 参数名 (用于动态参数和命名通配符) */
  paramName?: string;
  /** 各 HTTP 方法对应的处理器 */
  handlers: Record<Method, RouteHandler | undefined>;
}

/** 路由匹配结果 */
export interface MatchResult {
  handler: Handler;
  middleware: Middleware[];
  /** 预编译的组合处理器 */
  composedHandler: Handler;
  params: Record<string, string>;
}

/**
 * Radix Tree 路由器
 *
 * @example
 * ```typescript
 * const router = new RadixRouter();
 *
 * // 注册路由
 * router.register("GET", "/users", handler);
 * router.register("GET", "/users/:id", handler);
 *
 * // 通配符 - 默认参数名为 "*"
 * router.register("GET", "/files/*", handler);
 * // result.params = { "*": "path/to/file" }
 *
 * // 命名通配符 - 自定义参数名
 * router.register("GET", "/static/*filepath", handler);
 * // result.params = { filepath: "assets/style.css" }
 *
 * // 匹配路由
 * const result = router.match("GET", "/users/123");
 * // result.params = { id: "123" }
 * ```
 */
export class RadixRouter {
  private root: RadixNode;
  private pathCache: Record<string, string[]>;
  private pathCacheKeys: string[];
  private cacheMaxSize: number;
  /** 中间件组合函数（由外部注入） */
  private composeMiddleware: (middleware: Middleware[], handler: Handler) => Handler;

  constructor(options: {
    cacheMaxSize?: number;
    composeMiddleware?: (middleware: Middleware[], handler: Handler) => Handler;
  } = {}) {
    this.root = this.createNode("");
    this.pathCache = Object.create(null);
    this.pathCacheKeys = [];
    this.cacheMaxSize = options.cacheMaxSize ?? 10000;
    // 默认直接调用 handler
    this.composeMiddleware = options.composeMiddleware || ((_, handler) => handler);
  }

  /**
   * 设置中间件组合函数
   */
  setComposeMiddleware(fn: (middleware: Middleware[], handler: Handler) => Handler): void {
    this.composeMiddleware = fn;
  }

  /**
   * 创建新节点
   */
  private createNode(
    path: string,
    type: NodeType = NodeType.STATIC
  ): RadixNode {
    return {
      path,
      type,
      children: Object.create(null),
      handlers: Object.create(null),
    };
  }

  /**
   * 快速分割路径（避免 filter 开销）
   */
  private splitPath(path: string): string[] {
    const cached = this.pathCache[path];
    if (cached) return cached;

    // 手动分割，避免 filter(Boolean) 的数组创建开销
    const segments: string[] = [];
    let start = 0;
    const len = path.length;

    for (let i = 0; i <= len; i++) {
      if (i === len || path[i] === "/") {
        if (i > start) {
          segments.push(path.substring(start, i));
        }
        start = i + 1;
      }
    }

    // 限制缓存大小
    if (this.pathCacheKeys.length >= this.cacheMaxSize) {
      // 清除前半部分缓存
      const half = this.pathCacheKeys.length >> 1;
      for (let i = 0; i < half; i++) {
        delete this.pathCache[this.pathCacheKeys[i]];
      }
      this.pathCacheKeys = this.pathCacheKeys.slice(half);
    }

    this.pathCache[path] = segments;
    this.pathCacheKeys.push(path);
    return segments;
  }

  /**
   * 注册路由
   *
   * @param method HTTP 方法
   * @param pattern 路由模式 (支持 :param, * 和 *name)
   * @param handler 处理函数
   * @param middleware 中间件数组
   */
  register(
    method: Method,
    pattern: string,
    handler: Handler,
    middleware: Middleware[] = []
  ): void {
    const segments = this.splitPath(pattern);
    let node = this.root;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const firstChar = segment[0];

      if (firstChar === ":") {
        // 动态参数节点
        if (!node.paramChild) {
          node.paramChild = this.createNode(segment, NodeType.PARAM);
          node.paramChild.paramName = segment.substring(1);
        }
        node = node.paramChild;
      } else if (firstChar === "*") {
        // 通配符节点 (* 或 *name)
        if (!node.wildcardChild) {
          node.wildcardChild = this.createNode(segment, NodeType.WILDCARD);
          node.wildcardChild.paramName = segment.length > 1 ? segment.substring(1) : "*";
        }
        node = node.wildcardChild;
        break; // 通配符后面不再有路径
      } else {
        // 静态路径节点
        let child = node.children[segment];
        if (!child) {
          child = this.createNode(segment, NodeType.STATIC);
          node.children[segment] = child;
        }
        node = child;
      }
    }

    // 注册处理器（延迟编译 composedHandler）
    node.handlers[method] = { handler, middleware };
  }

  /**
   * 匹配路由
   *
   * @param method HTTP 方法
   * @param path 请求路径
   * @returns 匹配结果或 null
   */
  match(method: Method, path: string): MatchResult | null {
    const segments = this.splitPath(path);
    const params: Record<string, string> = Object.create(null);

    const node = this.matchNode(this.root, segments, 0, params);
    if (!node) return null;

    const routeHandler = node.handlers[method];
    if (!routeHandler) return null;

    // 延迟编译：首次访问时编译并缓存
    if (!routeHandler.composedHandler) {
      routeHandler.composedHandler = this.composeMiddleware(
        routeHandler.middleware,
        routeHandler.handler
      );
    }

    return {
      handler: routeHandler.handler,
      middleware: routeHandler.middleware,
      composedHandler: routeHandler.composedHandler,
      params,
    };
  }

  /**
   * 递归匹配节点
   *
   * 优先级: 静态路径 > 动态参数 > 通配符
   */
  private matchNode(
    node: RadixNode,
    segments: string[],
    index: number,
    params: Record<string, string>
  ): RadixNode | null {
    // 已匹配完所有路径段
    if (index === segments.length) {
      // 检查是否有处理器
      for (const method in node.handlers) {
        if (node.handlers[method as Method]) return node;
      }
      return null;
    }

    const segment = segments[index];

    // 1. 优先匹配静态路径 (最高优先级)
    const staticChild = node.children[segment];
    if (staticChild) {
      const result = this.matchNode(staticChild, segments, index + 1, params);
      if (result) return result;
    }

    // 2. 匹配动态参数
    if (node.paramChild) {
      const paramName = node.paramChild.paramName!;
      const oldValue = params[paramName];

      params[paramName] = segment;
      const result = this.matchNode(node.paramChild, segments, index + 1, params);

      if (result) return result;

      // 回溯：恢复原值
      if (oldValue === undefined) {
        delete params[paramName];
      } else {
        params[paramName] = oldValue;
      }
    }

    // 3. 匹配通配符 (最低优先级)
    if (node.wildcardChild) {
      const wildcardName = node.wildcardChild.paramName || "*";
      params[wildcardName] = segments.slice(index).join("/");
      return node.wildcardChild;
    }

    return null;
  }

  /**
   * 获取路径允许的 HTTP 方法 (用于 405 响应)
   *
   * @param path 请求路径
   * @returns 允许的方法数组
   */
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

  /**
   * 检查路径是否存在 (不关心方法)
   */
  hasPath(path: string): boolean {
    const segments = this.splitPath(path);
    const node = this.findNode(segments);
    if (!node) return false;

    for (const method in node.handlers) {
      if (node.handlers[method as Method]) return true;
    }
    return false;
  }

  /**
   * 查找节点（简化版，不提取参数）
   */
  private findNode(segments: string[]): RadixNode | null {
    let node = this.root;
    const len = segments.length;

    for (let i = 0; i < len; i++) {
      const segment = segments[i];

      // 静态路径
      const staticChild = node.children[segment];
      if (staticChild) {
        node = staticChild;
        continue;
      }

      // 动态参数
      if (node.paramChild) {
        node = node.paramChild;
        continue;
      }

      // 通配符
      if (node.wildcardChild) {
        return node.wildcardChild;
      }

      return null;
    }

    return node;
  }

  /**
   * 获取所有已注册的路由 (用于调试)
   */
  getRoutes(): Array<{ method: Method; path: string }> {
    const routes: Array<{ method: Method; path: string }> = [];
    this.collectRoutes(this.root, "", routes);
    return routes;
  }

  /**
   * 递归收集路由
   */
  private collectRoutes(
    node: RadixNode,
    prefix: string,
    routes: Array<{ method: Method; path: string }>
  ): void {
    const currentPath = prefix + (node.path ? "/" + node.path : "");

    // 收集当前节点的路由
    for (const method in node.handlers) {
      if (node.handlers[method as Method]) {
        routes.push({ method: method as Method, path: currentPath || "/" });
      }
    }

    // 递归静态子节点
    for (const key in node.children) {
      this.collectRoutes(node.children[key], currentPath, routes);
    }

    // 递归参数子节点
    if (node.paramChild) {
      this.collectRoutes(node.paramChild, currentPath, routes);
    }

    // 递归通配符子节点
    if (node.wildcardChild) {
      this.collectRoutes(node.wildcardChild, currentPath, routes);
    }
  }

  /**
   * 清除路径缓存
   */
  clearCache(): void {
    this.pathCache = Object.create(null);
    this.pathCacheKeys = [];
  }

  /**
   * 使所有已编译的处理器失效（当全局中间件变更时调用）
   */
  invalidateCompiledHandlers(): void {
    this.invalidateNode(this.root);
  }

  /**
   * 递归使节点的处理器失效
   */
  private invalidateNode(node: RadixNode): void {
    // 清除当前节点的编译缓存
    for (const method in node.handlers) {
      const handler = node.handlers[method as Method];
      if (handler) {
        handler.composedHandler = undefined;
      }
    }

    // 递归子节点
    for (const key in node.children) {
      this.invalidateNode(node.children[key]);
    }
    if (node.paramChild) {
      this.invalidateNode(node.paramChild);
    }
    if (node.wildcardChild) {
      this.invalidateNode(node.wildcardChild);
    }
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.pathCacheKeys.length,
      maxSize: this.cacheMaxSize,
    };
  }
}
