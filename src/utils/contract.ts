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
 * const routes = defineRoutes([...])
 * 
 * // 添加契约接口
 * const allRoutes = [
 *   ...routes,
 *   {
 *     method: 'GET',
 *     path: '/__contract__',
 *     handler: () => getContract(routes)
 *   }
 * ]
 * ```
 */

import type { TSchema } from '@sinclair/typebox'
import type { RouteSchema } from '../defineRoute'

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
 * @param routes - 路由数组
 * @returns ApiContract 对象
 * 
 * @example
 * ```typescript
 * import { defineRoutes, getContract } from 'vafast'
 * 
 * const routes = defineRoutes([...])
 * 
 * // 方式 1：添加契约接口
 * const allRoutes = [
 *   ...routes,
 *   {
 *     method: 'GET',
 *     path: '/__contract__',
 *     handler: () => getContract(routes)
 *   }
 * ]
 * 
 * // 方式 2：本地使用（CLI、测试）
 * const contract = getContract(routes)
 * console.log(contract.routes)
 * ```
 */
export function getContract(routes: readonly unknown[]): ApiContract {
  return generateContract(routes)
}
