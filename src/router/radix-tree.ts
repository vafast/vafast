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
}

/** Radix Tree 节点 */
interface RadixNode {
  /** 路径段 */
  path: string;
  /** 节点类型 */
  type: NodeType;
  /** 静态子节点 */
  children: Map<string, RadixNode>;
  /** 动态参数子节点 (:param) */
  paramChild?: RadixNode;
  /** 通配符子节点 (* 或 *name) */
  wildcardChild?: RadixNode;
  /** 参数名 (用于动态参数和命名通配符) */
  paramName?: string;
  /** 各 HTTP 方法对应的处理器 */
  handlers: Map<Method, RouteHandler>;
}

/** 路由匹配结果 */
export interface MatchResult {
  handler: Handler;
  middleware: Middleware[];
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
  private pathCache: Map<string, string[]>;
  private cacheMaxSize: number;

  constructor(options: { cacheMaxSize?: number } = {}) {
    this.root = this.createNode("");
    this.pathCache = new Map();
    this.cacheMaxSize = options.cacheMaxSize ?? 10000;
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
      children: new Map(),
      handlers: new Map(),
    };
  }

  /**
   * 分割并缓存路径
   */
  private splitPath(path: string): string[] {
    const cached = this.pathCache.get(path);
    if (cached) return cached;

    const segments = path.split("/").filter(Boolean);

    // 限制缓存大小，防止内存泄漏
    if (this.pathCache.size >= this.cacheMaxSize) {
      // 清除一半缓存
      const keys = Array.from(this.pathCache.keys());
      for (let i = 0; i < keys.length / 2; i++) {
        this.pathCache.delete(keys[i]);
      }
    }

    this.pathCache.set(path, segments);
    return segments;
  }

  /**
   * 解析通配符段，提取参数名
   *
   * @param segment 路径段 (如 "*" 或 "*filepath")
   * @returns 参数名 (如 "*" 或 "filepath")
   */
  private parseWildcard(segment: string): string {
    // "*" -> "*"
    // "*filepath" -> "filepath"
    // "*path" -> "path"
    if (segment === "*") {
      return "*";
    }
    return segment.slice(1); // 去掉开头的 *
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

      if (segment.startsWith(":")) {
        // 动态参数节点
        const paramName = segment.slice(1);
        if (!node.paramChild) {
          node.paramChild = this.createNode(segment, NodeType.PARAM);
          node.paramChild.paramName = paramName;
        }
        node = node.paramChild;
      } else if (segment.startsWith("*")) {
        // 通配符节点 (* 或 *name)
        const wildcardName = this.parseWildcard(segment);
        if (!node.wildcardChild) {
          node.wildcardChild = this.createNode(segment, NodeType.WILDCARD);
          node.wildcardChild.paramName = wildcardName;
        }
        node = node.wildcardChild;
        // 通配符后面不再有路径
        break;
      } else {
        // 静态路径节点
        let child = node.children.get(segment);
        if (!child) {
          child = this.createNode(segment, NodeType.STATIC);
          node.children.set(segment, child);
        }
        node = child;
      }
    }

    // 注册处理器
    node.handlers.set(method, { handler, middleware });
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
    const params: Record<string, string> = {};

    const node = this.matchNode(this.root, segments, 0, params);
    if (!node) return null;

    const routeHandler = node.handlers.get(method);
    if (!routeHandler) return null;

    return {
      handler: routeHandler.handler,
      middleware: routeHandler.middleware,
      params,
    };
  }

  /**
   * 获取路径允许的 HTTP 方法 (用于 405 响应)
   *
   * @param path 请求路径
   * @returns 允许的方法数组
   */
  getAllowedMethods(path: string): Method[] {
    const segments = this.splitPath(path);
    const params: Record<string, string> = {};

    const node = this.matchNode(this.root, segments, 0, params);
    if (!node) return [];

    return Array.from(node.handlers.keys());
  }

  /**
   * 检查路径是否存在 (不关心方法)
   */
  hasPath(path: string): boolean {
    const segments = this.splitPath(path);
    const params: Record<string, string> = {};
    const node = this.matchNode(this.root, segments, 0, params);
    return node !== null && node.handlers.size > 0;
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
      return node.handlers.size > 0 ? node : null;
    }

    const segment = segments[index];

    // 1. 优先匹配静态路径 (最高优先级)
    const staticChild = node.children.get(segment);
    if (staticChild) {
      const result = this.matchNode(staticChild, segments, index + 1, params);
      if (result) return result;
    }

    // 2. 匹配动态参数
    if (node.paramChild) {
      // 创建参数副本，避免失败匹配污染
      const paramsCopy = { ...params };
      paramsCopy[node.paramChild.paramName!] = segment;

      const result = this.matchNode(
        node.paramChild,
        segments,
        index + 1,
        paramsCopy
      );
      if (result) {
        // 匹配成功，合并参数
        Object.assign(params, paramsCopy);
        return result;
      }
    }

    // 3. 匹配通配符 (最低优先级)
    if (node.wildcardChild) {
      // 通配符匹配剩余所有路径
      const wildcardName = node.wildcardChild.paramName || "*";
      params[wildcardName] = segments.slice(index).join("/");
      return node.wildcardChild;
    }

    return null;
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
    for (const method of node.handlers.keys()) {
      routes.push({ method, path: currentPath || "/" });
    }

    // 递归静态子节点
    for (const child of node.children.values()) {
      this.collectRoutes(child, currentPath, routes);
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
    this.pathCache.clear();
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.pathCache.size,
      maxSize: this.cacheMaxSize,
    };
  }
}
