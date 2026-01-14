/**
 * API 契约生成器
 * 
 * 用于生成 API 契约，支持跨仓库类型同步
 * 
 * @example
 * ```typescript
 * import { defineRoutes, createContractHandler } from 'vafast'
 * 
 * const routes = defineRoutes([...])
 * 
 * // 添加契约接口
 * const allRoutes = defineRoutes([
 *   ...routes,
 *   {
 *     method: 'GET',
 *     path: '/__contract__',
 *     handler: createContractHandler(routes)
 *   }
 * ])
 * ```
 */

import type { TSchema } from '@sinclair/typebox'

/** 路由契约信息 */
interface RouteContract {
  method: string
  path: string
  schema?: {
    body?: TSchema
    query?: TSchema
    params?: TSchema
    headers?: TSchema
    cookies?: TSchema
  }
  return?: TSchema
}

/** API 契约 */
interface ApiContract {
  version: string
  generatedAt: string
  routes: RouteContract[]
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
      handler?: {
        __schema?: {
          body?: TSchema
          query?: TSchema
          params?: TSchema
          headers?: TSchema
          cookies?: TSchema
        }
        __returnType?: unknown
      }
    }

    if (!r.method || !r.path) continue
    
    // 跳过契约接口本身
    if (r.path === '/__contract__') continue

    const contract: RouteContract = {
      method: r.method,
      path: r.path,
    }

    // 提取 schema
    if (r.handler?.__schema) {
      const schema = r.handler.__schema
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
 * 创建契约接口的 Handler
 * 
 * @param routes - 路由数组
 * @returns Handler 函数
 * 
 * @example
 * ```typescript
 * const routes = defineRoutes([
 *   { method: 'GET', path: '/users', handler: createHandler(...) },
 *   { method: 'POST', path: '/users', handler: createHandler(...) }
 * ])
 * 
 * // 添加契约接口（可加鉴权中间件）
 * const allRoutes = defineRoutes([
 *   ...routes,
 *   {
 *     method: 'GET',
 *     path: '/__contract__',
 *     middleware: [adminAuth],  // 可选：添加鉴权
 *     handler: createContractHandler(routes)
 *   }
 * ])
 * ```
 */
export function createContractHandler(routes: readonly unknown[]): (req: Request) => Promise<Response> {
  // 预生成契约（避免每次请求都计算）
  const contract = generateContract(routes)
  const contractJson = JSON.stringify(contract, null, 2)

  return async (_req: Request): Promise<Response> => {
    return new Response(contractJson, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    })
  }
}

/**
 * 直接生成契约 JSON（用于 CLI 工具或测试）
 */
export function getContract(routes: readonly unknown[]): ApiContract {
  return generateContract(routes)
}
