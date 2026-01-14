/**
 * API 契约生成器测试
 */

import { describe, it, expect } from 'vitest'
import { createContractHandler, getContract } from '../../src/utils/contract'
import { createHandler } from '../../src/utils/create-handler'
import { Type } from '@sinclair/typebox'

describe('API 契约生成器', () => {
  // 测试路由
  const routes = [
    {
      method: 'GET',
      path: '/users',
      handler: createHandler(
        { query: Type.Object({ page: Type.Optional(Type.Number()) }) },
        async ({ query }) => ({ users: [], page: query.page ?? 1 })
      )
    },
    {
      method: 'POST',
      path: '/users',
      handler: createHandler(
        { body: Type.Object({ name: Type.String(), email: Type.String() }) },
        async ({ body }) => ({ id: '1', name: body.name })
      )
    },
    {
      method: 'GET',
      path: '/users/:id',
      handler: createHandler(
        { params: Type.Object({ id: Type.String() }) },
        async ({ params }) => ({ id: params.id, name: 'User' })
      )
    },
    {
      method: 'DELETE',
      path: '/users/:id',
      handler: createHandler(async () => ({ success: true }))
    }
  ] as const

  describe('getContract', () => {
    it('应该生成正确的契约结构', () => {
      const contract = getContract(routes)

      expect(contract.version).toBe('1.0.0')
      expect(contract.generatedAt).toBeDefined()
      expect(contract.routes).toHaveLength(4)
    })

    it('应该包含所有路由的 method 和 path', () => {
      const contract = getContract(routes)

      expect(contract.routes[0].method).toBe('GET')
      expect(contract.routes[0].path).toBe('/users')

      expect(contract.routes[1].method).toBe('POST')
      expect(contract.routes[1].path).toBe('/users')

      expect(contract.routes[2].method).toBe('GET')
      expect(contract.routes[2].path).toBe('/users/:id')
    })

    it('应该提取 query schema', () => {
      const contract = getContract(routes)
      const getUsersRoute = contract.routes[0]

      expect(getUsersRoute.schema?.query).toBeDefined()
      expect(getUsersRoute.schema?.query?.type).toBe('object')
    })

    it('应该提取 body schema', () => {
      const contract = getContract(routes)
      const postUsersRoute = contract.routes[1]

      expect(postUsersRoute.schema?.body).toBeDefined()
      expect(postUsersRoute.schema?.body?.type).toBe('object')
      expect(postUsersRoute.schema?.body?.properties?.name).toBeDefined()
      expect(postUsersRoute.schema?.body?.properties?.email).toBeDefined()
    })

    it('应该提取 params schema', () => {
      const contract = getContract(routes)
      const getUserByIdRoute = contract.routes[2]

      expect(getUserByIdRoute.schema?.params).toBeDefined()
      expect(getUserByIdRoute.schema?.params?.type).toBe('object')
      expect(getUserByIdRoute.schema?.params?.properties?.id).toBeDefined()
    })

    it('无 schema 的路由应该没有 schema 字段', () => {
      const contract = getContract(routes)
      const deleteUserRoute = contract.routes[3]

      expect(deleteUserRoute.schema).toBeUndefined()
    })

    it('应该跳过 /__contract__ 路由', () => {
      const routesWithContract = [
        ...routes,
        {
          method: 'GET',
          path: '/__contract__',
          handler: createContractHandler(routes)
        }
      ]

      const contract = getContract(routesWithContract)
      
      // 应该只有 4 个路由，不包含 /__contract__
      expect(contract.routes).toHaveLength(4)
      expect(contract.routes.find(r => r.path === '/__contract__')).toBeUndefined()
    })
  })

  describe('createContractHandler', () => {
    it('应该返回 JSON 响应', async () => {
      const handler = createContractHandler(routes)
      const req = new Request('http://localhost/__contract__')
      
      const response = await handler(req)
      
      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toContain('application/json')
    })

    it('应该返回有效的 JSON', async () => {
      const handler = createContractHandler(routes)
      const req = new Request('http://localhost/__contract__')
      
      const response = await handler(req)
      const contract = await response.json()
      
      expect(contract.version).toBe('1.0.0')
      expect(contract.routes).toHaveLength(4)
    })

    it('应该设置 no-cache 头', async () => {
      const handler = createContractHandler(routes)
      const req = new Request('http://localhost/__contract__')
      
      const response = await handler(req)
      
      expect(response.headers.get('Cache-Control')).toBe('no-cache')
    })
  })
})
