/**
 * API 契约生成器测试
 */

import { describe, it, expect, expectTypeOf } from 'vitest'
import { getContract, generateAITools } from '../../src/utils/contract'
import { defineRoutes, defineRoute, defineMiddleware } from '../../src/defineRoute'
import { Type } from '@sinclair/typebox'

describe('API 契约生成器', () => {
  // 使用 defineRoute 获得完整类型推断
  const routes = defineRoutes([
    defineRoute({
      method: 'GET',
      path: '/users',
      name: 'get_users',
      description: '获取用户列表',
      schema: { query: Type.Object({ page: Type.Optional(Type.Number()) }) },
      handler: async ({ query }) => ({ users: [], page: query.page ?? 1 })
    }),
    defineRoute({
      method: 'POST',
      path: '/users',
      name: 'create_user',
      description: '创建用户',
      schema: { body: Type.Object({ name: Type.String(), email: Type.String() }) },
      handler: async ({ body }) => ({ id: '1', name: body.name })
    }),
    defineRoute({
      method: 'GET',
      path: '/users/:id',
      name: 'get_user',
      description: '获取用户详情',
      schema: { params: Type.Object({ id: Type.String() }) },
      handler: async ({ params }) => ({ id: params.id, name: 'User' })
    }),
    defineRoute({
      method: 'DELETE',
      path: '/users/:id',
      handler: async () => ({ success: true })
    })
  ])

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

    it('应该包含 name 和 description', () => {
      const contract = getContract(routes)

      expect(contract.routes[0].name).toBe('get_users')
      expect(contract.routes[0].description).toBe('获取用户列表')

      expect(contract.routes[1].name).toBe('create_user')
      expect(contract.routes[1].description).toBe('创建用户')
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
          method: 'GET' as const,
          path: '/__contract__',
          handler: () => getContract(routes)
        }
      ]

      const contract = getContract(routesWithContract)

      // 应该只有 4 个路由，不包含 /__contract__
      expect(contract.routes).toHaveLength(4)
      expect(contract.routes.find(r => r.path === '/__contract__')).toBeUndefined()
    })
  })

  describe('generateAITools', () => {
    it('应该生成 AI 工具函数格式', () => {
      const tools = generateAITools(routes)

      expect(tools).toHaveLength(4)
      expect(tools[0].name).toBe('get_users')
      expect(tools[0].description).toBe('获取用户列表')
    })

    it('GET 请求应该使用 query 作为 parameters', () => {
      const tools = generateAITools(routes)

      expect(tools[0].parameters).toBeDefined()
      expect(tools[0].parameters?.type).toBe('object')
    })

    it('POST 请求应该使用 body 作为 parameters', () => {
      const tools = generateAITools(routes)

      expect(tools[1].parameters).toBeDefined()
      expect(tools[1].parameters?.properties?.name).toBeDefined()
    })

    it('无 schema 的路由应该没有 parameters', () => {
      const tools = generateAITools(routes)

      expect(tools[3].parameters).toBeUndefined()
    })

    it('没有 name 的路由应该从 path 生成名称', () => {
      const tools = generateAITools(routes)

      // DELETE /users/:id 没有 name，应该生成 delete_users
      expect(tools[3].name).toBe('delete_users')
    })
  })

  describe('类型推断', () => {
    it('body 应该正确推断类型', () => {
      defineRoute({
        method: 'POST',
        path: '/test',
        schema: { body: Type.Object({ name: Type.String(), age: Type.Number() }) },
        handler: ({ body }) => {
          // 验证 body 属性类型
          expectTypeOf(body.name).toBeString()
          expectTypeOf(body.age).toBeNumber()
          return body
        }
      })
    })

    it('query 应该正确推断类型', () => {
      defineRoute({
        method: 'GET',
        path: '/test',
        schema: { query: Type.Object({ page: Type.Number(), limit: Type.Number() }) },
        handler: ({ query }) => {
          // 验证 query 属性类型
          expectTypeOf(query.page).toBeNumber()
          expectTypeOf(query.limit).toBeNumber()
          return query
        }
      })
    })

    it('params 应该正确推断类型', () => {
      defineRoute({
        method: 'GET',
        path: '/users/:id',
        schema: { params: Type.Object({ id: Type.String() }) },
        handler: ({ params }) => {
          // 验证 params 属性类型
          expectTypeOf(params.id).toBeString()
          return params
        }
      })
    })

    it('无 schema 时上下文属性应该是默认类型', () => {
      defineRoute({
        method: 'GET',
        path: '/test',
        handler: ({ query, params }) => {
          // 无 schema 时，query 和 params 是 Record<string, string>
          expectTypeOf(query).toEqualTypeOf<Record<string, string>>()
          expectTypeOf(params).toEqualTypeOf<Record<string, string>>()
          return { ok: true }
        }
      })
    })

    it('多个 schema 字段应该同时正确推断', () => {
      defineRoute({
        method: 'POST',
        path: '/users/:id',
        schema: {
          params: Type.Object({ id: Type.String() }),
          body: Type.Object({ name: Type.String() }),
          query: Type.Object({ version: Type.Number() })
        },
        handler: ({ params, body, query }) => {
          expectTypeOf(params.id).toBeString()
          expectTypeOf(body.name).toBeString()
          expectTypeOf(query.version).toBeNumber()
          return { id: params.id, name: body.name }
        }
      })
    })

    it('嵌套路由中子路由应该正确推断类型', () => {
      defineRoute({
        path: '/api',
        children: [
          defineRoute({
            method: 'POST',
            path: '/users',
            schema: { body: Type.Object({ name: Type.String() }) },
            handler: ({ body }) => {
              expectTypeOf(body.name).toBeString()
              return { name: body.name }
            }
          })
        ]
      })
    })
  })

  describe('嵌套路由', () => {
    it('应该正确扁平化嵌套路由', () => {
      const nestedRoutes = defineRoutes([
        defineRoute({
          path: '/api',
          children: [
            defineRoute({
              method: 'GET',
              path: '/users',
              handler: () => []
            }),
            defineRoute({
              method: 'POST',
              path: '/users',
              schema: { body: Type.Object({ name: Type.String() }) },
              handler: ({ body }) => ({ name: body.name })
            })
          ]
        })
      ])

      expect(nestedRoutes).toHaveLength(2)
      expect(nestedRoutes[0].path).toBe('/api/users')
      expect(nestedRoutes[0].method).toBe('GET')
      expect(nestedRoutes[1].path).toBe('/api/users')
      expect(nestedRoutes[1].method).toBe('POST')
    })

    it('应该合并中间件', () => {
      const parentMiddleware = async (_req: Request, next: () => Promise<Response>) => next()
      const childMiddleware = async (_req: Request, next: () => Promise<Response>) => next()

      const nestedRoutes = defineRoutes([
        defineRoute({
          path: '/api',
          middleware: [parentMiddleware],
          children: [
            defineRoute({
              method: 'GET',
              path: '/users',
              middleware: [childMiddleware],
              handler: () => []
            })
          ]
        })
      ])

      expect(nestedRoutes[0].middleware).toHaveLength(2)
      expect(nestedRoutes[0].middleware?.[0]).toBe(parentMiddleware)
      expect(nestedRoutes[0].middleware?.[1]).toBe(childMiddleware)
    })

    it('应该支持多层嵌套', () => {
      const nestedRoutes = defineRoutes([
        defineRoute({
          path: '/api',
          children: [
            defineRoute({
              path: '/v1',
              children: [
                defineRoute({
                  method: 'GET',
                  path: '/users',
                  handler: () => []
                })
              ]
            })
          ]
        })
      ])

      expect(nestedRoutes).toHaveLength(1)
      expect(nestedRoutes[0].path).toBe('/api/v1/users')
    })

    it('嵌套路由应该保留 schema 用于契约生成', () => {
      const nestedRoutes = defineRoutes([
        defineRoute({
          path: '/api',
          children: [
            defineRoute({
              method: 'POST',
              path: '/users',
              schema: { body: Type.Object({ name: Type.String() }) },
              handler: ({ body }) => ({ name: body.name })
            })
          ]
        })
      ])

      expect(nestedRoutes[0].schema?.body).toBeDefined()
    })

    it('嵌套路由应该能生成 AI tools', () => {
      const nestedRoutes = defineRoutes([
        defineRoute({
          path: '/api',
          children: [
            defineRoute({
              method: 'POST',
              path: '/users',
              name: 'create_user',
              description: '创建用户',
              schema: { body: Type.Object({ name: Type.String() }) },
              handler: ({ body }) => ({ name: body.name })
            })
          ]
        })
      ])

      const tools = generateAITools(nestedRoutes)
      expect(tools).toHaveLength(1)
      expect(tools[0].name).toBe('create_user')
      expect(tools[0].parameters).toBeDefined()
    })
  })

  describe('中间件类型推断', () => {
    // 定义带类型的中间件（函数式风格，通过 next 传递上下文）
    type AuthContext = { user: { id: string; name: string } }
    const authMiddleware = defineMiddleware<AuthContext>(async (_req, next) => {
      return next({ user: { id: '1', name: 'Test User' } })
    })

    type AdminContext = { permissions: string[] }
    const adminMiddleware = defineMiddleware<AdminContext>(async (_req, next) => {
      return next({ permissions: ['read', 'write'] })
    })

    it('单个中间件应该正确推断类型', () => {
      defineRoute({
        method: 'GET',
        path: '/profile',
        middleware: [authMiddleware],
        handler: ({ user }) => {
          expectTypeOf(user.id).toBeString()
          expectTypeOf(user.name).toBeString()
          return { userId: user.id }
        }
      })
    })

    it('多个中间件应该合并类型', () => {
      defineRoute({
        method: 'GET',
        path: '/admin',
        middleware: [authMiddleware, adminMiddleware],
        handler: ({ user, permissions }) => {
          expectTypeOf(user.id).toBeString()
          expectTypeOf(permissions).toEqualTypeOf<string[]>()
          return { userId: user.id, can: permissions }
        }
      })
    })

    it('中间件类型应该与 schema 类型共存', () => {
      defineRoute({
        method: 'POST',
        path: '/users',
        middleware: [authMiddleware],
        schema: { body: Type.Object({ name: Type.String() }) },
        handler: ({ user, body }) => {
          expectTypeOf(user.id).toBeString()
          expectTypeOf(body.name).toBeString()
          return { createdBy: user.id, name: body.name }
        }
      })
    })

    it('运行时应该正确传递中间件上下文', async () => {
      const routes = defineRoutes([
        defineRoute({
          method: 'GET',
          path: '/test',
          middleware: [authMiddleware],
          handler: ({ user }) => ({ userId: user.id, userName: user.name })
        })
      ])

      // 模拟请求
      const req = new Request('http://localhost/test')
      const handler = routes[0].handler

      // 先执行中间件
      const middleware = routes[0].middleware![0]
      let handlerCalled = false
      await middleware(req, async () => {
        handlerCalled = true
        return new Response()
      })

      expect(handlerCalled).toBe(true)
    })
  })
})
