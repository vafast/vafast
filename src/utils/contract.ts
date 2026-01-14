/**
 * API 契约生成器
 * 
 * 用于生成 API 契约，支持：
 * - 跨仓库类型同步
 * - AI 工具函数生成
 * - Swagger 文档生成
 * 
 * @example
 * ```typescript
 * import { defineRoutes, getContract } from 'vafast'
 * 
 * // 方式 1：直接作为 handler（推荐，自动从全局 Registry 获取）
 * const allRoutes = [
 *   ...routes,
 *   { method: 'GET', path: '/__contract__', handler: getContract }
 * ]
 * 
 * // 方式 2：显式传参（灵活场景，如只暴露公开 API）
 * { handler: () => getContract(publicRoutes) }
 * ```
 */

import type { TSchema } from '@sinclair/typebox'
import type { RouteSchema } from '../defineRoute'
import { getRouteRegistry } from './route-registry'

/** 路由契约信息 */
interface RouteContract {
  method: string
  path: string
  name?: string
  description?: string
  schema?: {
    body?: TSchema
    query?: TSchema
    params?: TSchema
    headers?: TSchema
    cookies?: TSchema
  }
}

/** API 契约 */
interface ApiContract {
  version: string
  generatedAt: string
  routes: RouteContract[]
}

/** AI 工具函数格式 */
interface AITool {
  name: string
  description?: string
  parameters?: TSchema
}

/**
 * 从路由数组生成 API 契约
 */
function generateContract(routes: readonly unknown[]): ApiContract {
  const routeContracts: RouteContract[] = []

  for (const route of routes) {
    const r = route as {
      method?: string
      path?: string
      name?: string
      description?: string
      schema?: RouteSchema
    }

    if (!r.method || !r.path) continue
    
    // 跳过契约接口本身
    if (r.path === '/__contract__') continue

    const contract: RouteContract = {
      method: r.method,
      path: r.path,
    }

    // 直接从路由获取 name 和 description
    if (r.name) contract.name = r.name
    if (r.description) contract.description = r.description

    // 直接从路由获取 schema
    if (r.schema) {
      const schema = r.schema
      if (schema.body || schema.query || schema.params || schema.headers || schema.cookies) {
        contract.schema = {}
        if (schema.body) contract.schema.body = schema.body
        if (schema.query) contract.schema.query = schema.query
        if (schema.params) contract.schema.params = schema.params
        if (schema.headers) contract.schema.headers = schema.headers
        if (schema.cookies) contract.schema.cookies = schema.cookies
      }
    }

    routeContracts.push(contract)
  }

  return {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    routes: routeContracts,
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
    if (r.path === '/__contract__') continue

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
 * 获取 API 契约
 * 
 * 支持多种调用方式：
 * 1. 直接作为 handler：自动从全局 Registry 获取（推荐）
 * 2. 无参调用：同上，用于 CLI/测试
 * 3. 有参调用：显式传递路由数组（灵活场景）
 * 
 * @param routesOrContext - 可选，路由数组或 handler context。不传则从全局 Registry 获取
 * @returns ApiContract 对象
 * 
 * @example
 * ```typescript
 * import { getContract } from 'vafast'
 * 
 * // 方式 1：直接作为 handler（推荐，最简洁）
 * { method: 'GET', path: '/__contract__', handler: getContract }
 * 
 * // 方式 2：显式传参（只暴露公开 API）
 * { handler: () => getContract(publicRoutes) }
 * 
 * // 方式 3：本地使用（CLI、测试）
 * const contract = getContract()
 * ```
 */
export function getContract(routesOrContext?: readonly unknown[] | Record<string, unknown>): ApiContract {
  // 智能检测：是路由数组还是 handler context
  // 路由数组：Array && 第一个元素有 method 属性
  const isRoutesArray = Array.isArray(routesOrContext) && 
    routesOrContext.length > 0 && 
    typeof (routesOrContext[0] as Record<string, unknown>)?.method === 'string'
  
  const routeList = isRoutesArray 
    ? routesOrContext 
    : getRoutesFromRegistry()
  
  return generateContract(routeList)
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
