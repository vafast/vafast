/**
 * API Spec 生成器
 *
 * 用于生成 API 规范，支持：
 * - 跨仓库类型同步
 * - AI 工具函数生成
 * - Swagger/OpenAPI 文档生成
 *
 * @example
 * ```typescript
 * import { getApiSpec } from 'vafast'
 *
 * // 方式 1：直接作为 handler（推荐，自动从全局 Registry 获取）
 * const allRoutes = [
 *   ...routes,
 *   { method: 'GET', path: '/api-spec', handler: getApiSpec }
 * ]
 *
 * // 方式 2：显式传参（灵活场景，如只暴露公开 API）
 * { handler: () => getApiSpec(publicRoutes) }
 * ```
 */

import type { TSchema } from '@sinclair/typebox'
import type { RouteSchema } from '../defineRoute'
import { getRouteRegistry } from './route-registry'

/** 路由规范信息 */
interface RouteSpec {
  method: string
  path: string
  name?: string
  description?: string
  /** 是否为 SSE 端点（Server-Sent Events） */
  sse?: boolean
  schema?: {
    body?: TSchema
    query?: TSchema
    params?: TSchema
    headers?: TSchema
    cookies?: TSchema
    response?: TSchema
  }
}

/** API 规范 */
export interface ApiSpec {
  version: string
  generatedAt: string
  routes: RouteSpec[]
}

/** AI 工具函数格式 */
interface AITool {
  name: string
  description?: string
  parameters?: TSchema
}

/**
 * 从路由数组生成 API 规范
 */
function generateSpec(routes: readonly unknown[]): ApiSpec {
  const routeSpecs: RouteSpec[] = []

  for (const route of routes) {
    const r = route as {
      method?: string
      path?: string
      name?: string
      description?: string
      schema?: RouteSchema
      sse?: boolean
    }

    if (!r.method || !r.path) continue

    // 跳过 spec 接口本身
    if (r.path === '/api-spec' || r.path === '/__spec__') continue

    const spec: RouteSpec = {
      method: r.method,
      path: r.path,
    }

    // 直接从路由获取 name 和 description
    if (r.name) spec.name = r.name
    if (r.description) spec.description = r.description

    // SSE 标记
    if (r.sse === true) {
      spec.sse = true
    }

    // 直接从路由获取 schema
    if (r.schema) {
      const schema = r.schema
      if (schema.body || schema.query || schema.params || schema.headers || schema.cookies || schema.response) {
        spec.schema = {}
        if (schema.body) spec.schema.body = schema.body
        if (schema.query) spec.schema.query = schema.query
        if (schema.params) spec.schema.params = schema.params
        if (schema.headers) spec.schema.headers = schema.headers
        if (schema.cookies) spec.schema.cookies = schema.cookies
        if (schema.response) spec.schema.response = schema.response
      }
    }

    routeSpecs.push(spec)
  }

  return {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    routes: routeSpecs,
  }
}

/**
 * 从路由数组生成 AI 工具函数
 *
 * 可直接用于 OpenAI Function Calling / Claude Tools
 *
 * @example
 * ```typescript
 * const tools = generateAITools(routes)
 * // [{ name: 'get_users', description: '获取用户列表', parameters: {...} }]
 * ```
 */
export function generateAITools(routes: readonly unknown[]): AITool[] {
  const tools: AITool[] = []

  for (const route of routes) {
    const r = route as {
      method?: string
      path?: string
      name?: string
      description?: string
      schema?: RouteSchema
    }

    if (!r.method || !r.path) continue
    if (r.path === '/api-spec' || r.path === '/__spec__') continue

    // 使用 name 或从 path 生成
    const name = r.name || pathToToolName(r.method, r.path)

    const tool: AITool = { name }
    if (r.description) tool.description = r.description

    // GET 用 query，其他用 body
    if (r.schema) {
      if (r.method === 'GET' && r.schema.query) {
        tool.parameters = r.schema.query
      } else if (r.schema.body) {
        tool.parameters = r.schema.body
      }
    }

    tools.push(tool)
  }

  return tools
}

/** 从路径生成工具名 */
function pathToToolName(method: string, path: string): string {
  const segments = path.split('/').filter(Boolean)
  const cleanSegments = segments
    .map(s => s.startsWith(':') ? '' : s)
    .filter(Boolean)

  const prefix = method.toLowerCase()
  const suffix = cleanSegments.join('_')

  return suffix ? `${prefix}_${suffix}` : prefix
}

/**
 * 获取 API 规范
 *
 * 支持多种调用方式：
 * 1. 直接作为 handler：自动从全局 Registry 获取（推荐）
 * 2. 无参调用：同上，用于 CLI/测试
 * 3. 有参调用：显式传递路由数组（灵活场景）
 *
 * @param routesOrContext - 可选，路由数组或 handler context。不传则从全局 Registry 获取
 * @returns ApiSpec 对象
 *
 * @example
 * ```typescript
 * import { getApiSpec } from 'vafast'
 *
 * // 方式 1：直接作为 handler（推荐，最简洁）
 * { method: 'GET', path: '/api-spec', handler: getApiSpec }
 *
 * // 方式 2：显式传参（只暴露公开 API）
 * { handler: () => getApiSpec(publicRoutes) }
 *
 * // 方式 3：本地使用（CLI、测试）
 * const spec = getApiSpec()
 * ```
 */
export function getApiSpec(routesOrContext?: readonly unknown[] | Record<string, unknown>): ApiSpec {
  // 智能检测：是路由数组还是 handler context
  // 路由数组：Array && 第一个元素有 method 属性
  const isRoutesArray = Array.isArray(routesOrContext) &&
    routesOrContext.length > 0 &&
    typeof (routesOrContext[0] as Record<string, unknown>)?.method === 'string'

  const routeList = isRoutesArray
    ? routesOrContext
    : getRoutesFromRegistry()

  return generateSpec(routeList)
}

/**
 * 从全局 Registry 获取路由列表
 * 包含 schema 信息（Registry 存储完整路由）
 */
function getRoutesFromRegistry(): readonly unknown[] {
  try {
    const registry = getRouteRegistry()
    return registry.getAll()
  } catch {
    // Registry 未初始化时返回空数组
    return []
  }
}
