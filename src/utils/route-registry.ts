/**
 * 路由注册表
 *
 * 提供路由元信息的收集和查询能力
 * 可用于：API 文档生成、Webhook 事件注册、权限检查、审计日志等
 *
 * @example
 * ```typescript
 * // 创建注册表
 * const registry = createRouteRegistry(server.getRoutes())
 *
 * // 查询路由
 * const route = registry.get('POST', '/auth/signIn')
 *
 * // 筛选有 webhook 配置的路由
 * const webhookRoutes = registry.filter('webhook')
 *
 * // 按分类获取
 * const authRoutes = registry.getByCategory('auth')
 * ```
 */

import type { FlattenedRoute, Method } from '../types'

/**
 * 路由元信息（不含 handler 和 middleware）
 */
export interface RouteMeta {
  method: Method
  path: string
  fullPath: string
  name?: string
  description?: string
  /** 扩展字段 */
  [key: string]: unknown
}

/**
 * 路由注册表
 *
 * 泛型 T 用于定义扩展字段的类型
 */
export class RouteRegistry<T extends Record<string, unknown> = Record<string, unknown>> {
  /** 所有路由元信息 */
  private routes: RouteMeta[] = []

  /** 路由映射表：METHOD:fullPath -> RouteMeta */
  private routeMap = new Map<string, RouteMeta>()

  /** 分类映射表：category -> RouteMeta[] */
  private categoryMap = new Map<string, RouteMeta[]>()

  constructor(routes: FlattenedRoute[]) {
    this.buildRegistry(routes)
  }

  /**
   * 构建注册表
   */
  private buildRegistry(routes: FlattenedRoute[]): void {
    for (const route of routes) {
      // 提取元信息（排除 handler 和 middleware）
      const meta: RouteMeta = {
        method: route.method,
        path: route.path,
        fullPath: route.fullPath,
        name: route.name,
        description: route.description,
      }

      // 复制扩展字段
      for (const key of Object.keys(route)) {
        if (!['method', 'path', 'fullPath', 'name', 'description', 'handler', 'middleware', 'middlewareChain'].includes(key)) {
          meta[key] = route[key as keyof FlattenedRoute]
        }
      }

      this.routes.push(meta)
      this.routeMap.set(`${route.method}:${route.fullPath}`, meta)

      // 按分类索引
      const category = this.extractCategory(route.fullPath)
      if (!this.categoryMap.has(category)) {
        this.categoryMap.set(category, [])
      }
      this.categoryMap.get(category)!.push(meta)
    }
  }

  /**
   * 提取分类（第一段路径）
   */
  private extractCategory(path: string): string {
    const segments = path.split('/').filter(Boolean)
    return segments[0] || 'root'
  }

  // ============================================
  // 查询接口
  // ============================================

  /**
   * 获取所有路由元信息
   */
  getAll(): RouteMeta[] {
    return [...this.routes]
  }

  /**
   * 按 method + path 查询路由
   */
  get(method: string, path: string): (RouteMeta & T) | undefined {
    return this.routeMap.get(`${method}:${path}`) as (RouteMeta & T) | undefined
  }

  /**
   * 检查路由是否存在
   */
  has(method: string, path: string): boolean {
    return this.routeMap.has(`${method}:${path}`)
  }

  /**
   * 按分类获取路由
   */
  getByCategory(category: string): RouteMeta[] {
    return this.categoryMap.get(category) || []
  }

  /**
   * 获取所有分类
   */
  getCategories(): string[] {
    return Array.from(this.categoryMap.keys()).sort()
  }

  /**
   * 筛选有特定字段的路由
   *
   * @example
   * ```typescript
   * // 获取所有配置了 webhook 的路由
   * const webhookRoutes = registry.filter('webhook')
   * ```
   */
  filter<K extends string>(field: K): (RouteMeta & Record<K, unknown>)[] {
    return this.routes.filter((r) => field in r && r[field] !== undefined) as (RouteMeta & Record<K, unknown>)[]
  }

  /**
   * 按条件筛选路由
   *
   * @example
   * ```typescript
   * // 获取所有 POST 请求
   * const postRoutes = registry.filterBy(r => r.method === 'POST')
   * ```
   */
  filterBy(predicate: (route: RouteMeta) => boolean): RouteMeta[] {
    return this.routes.filter(predicate)
  }

  /**
   * 获取路由数量
   */
  get size(): number {
    return this.routes.length
  }

  /**
   * 遍历所有路由
   */
  forEach(callback: (route: RouteMeta, index: number) => void): void {
    this.routes.forEach(callback)
  }

  /**
   * 映射所有路由
   */
  map<R>(callback: (route: RouteMeta, index: number) => R): R[] {
    return this.routes.map(callback)
  }
}

/**
 * 创建路由注册表
 *
 * @example
 * ```typescript
 * // 定义扩展字段类型
 * interface MyRouteMeta {
 *   webhook?: { eventKey: string }
 *   permission?: string
 * }
 *
 * // 创建带类型的注册表
 * const registry = createRouteRegistry<MyRouteMeta>(server.getRoutes())
 *
 * // 类型安全的查询
 * const route = registry.get('POST', '/auth/signIn')
 * if (route?.webhook) {
 *   console.log(route.webhook.eventKey)
 * }
 * ```
 */
export function createRouteRegistry<T extends Record<string, unknown> = Record<string, unknown>>(
  routes: FlattenedRoute[]
): RouteRegistry<T> {
  return new RouteRegistry<T>(routes)
}

