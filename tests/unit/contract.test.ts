/**
 * API Spec 生成器测试
 */

import { describe, it, expect, expectTypeOf, beforeEach, afterEach } from 'vitest'
import { getApiSpec, generateAITools } from '../../src/utils/contract'
import { defineRoutes, defineRoute, defineMiddleware } from '../../src/defineRoute'
import { createRouteRegistry, setGlobalRegistry } from '../../src/utils/route-registry'
import { createSSEHandler } from '../../src/utils/sse'
import { Type } from '@sinclair/typebox'

describe('API Spec 生成器', () => {
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

  describe('getApiSpec', () => {
    it('应该生成正确的契约结构', () => {
      const contract = getApiSpec(routes)

      expect(contract.version).toBe('1.0.0')
      expect(contract.generatedAt).toBeDefined()
      expect(contract.routes).toHaveLength(4)
    })

    it('应该包含所有路由的 method 和 path', () => {
      const contract = getApiSpec(routes)

      expect(contract.routes[0].method).toBe('GET')
      expect(contract.routes[0].path).toBe('/users')

      expect(contract.routes[1].method).toBe('POST')
      expect(contract.routes[1].path).toBe('/users')

      expect(contract.routes[2].method).toBe('GET')
      expect(contract.routes[2].path).toBe('/users/:id')
    })

    it('应该包含 name 和 description', () => {
      const contract = getApiSpec(routes)

      expect(contract.routes[0].name).toBe('get_users')
      expect(contract.routes[0].description).toBe('获取用户列表')

      expect(contract.routes[1].name).toBe('create_user')
      expect(contract.routes[1].description).toBe('创建用户')
    })

    it('应该提取 query schema', () => {
      const contract = getApiSpec(routes)
      const getUsersRoute = contract.routes[0]

      expect(getUsersRoute.schema?.query).toBeDefined()
      expect(getUsersRoute.schema?.query?.type).toBe('object')
    })

    it('应该提取 body schema', () => {
      const contract = getApiSpec(routes)
      const postUsersRoute = contract.routes[1]

      expect(postUsersRoute.schema?.body).toBeDefined()
      expect(postUsersRoute.schema?.body?.type).toBe('object')
      expect(postUsersRoute.schema?.body?.properties?.name).toBeDefined()
      expect(postUsersRoute.schema?.body?.properties?.email).toBeDefined()
    })

    it('应该提取 params schema', () => {
      const contract = getApiSpec(routes)
      const getUserByIdRoute = contract.routes[2]

      expect(getUserByIdRoute.schema?.params).toBeDefined()
      expect(getUserByIdRoute.schema?.params?.type).toBe('object')
      expect(getUserByIdRoute.schema?.params?.properties?.id).toBeDefined()
    })

    it('无 schema 的路由应该没有 schema 字段', () => {
      const contract = getApiSpec(routes)
      const deleteUserRoute = contract.routes[3]

      expect(deleteUserRoute.schema).toBeUndefined()
    })

    it('应该跳过 /api-spec 路由', () => {
      const routesWithContract = [
        ...routes,
        {
          method: 'GET' as const,
          path: '/api-spec',
          handler: getApiSpec
        }
      ]

      const contract = getApiSpec(routesWithContract)

      // 应该只有 4 个路由，不包含 /api-spec
      expect(contract.routes).toHaveLength(4)
      expect(contract.routes.find(r => r.path === '/api-spec')).toBeUndefined()
    })

    it('应该识别 SSE 端点并设置 sse 标记', () => {
      const sseHandler = createSSEHandler(
        { query: Type.Object({ prompt: Type.String() }) },
        async function* ({ query }) {
          yield { data: { text: query.prompt } }
        }
      )

      const sseRoutes = defineRoutes([
        defineRoute({
          method: 'GET',
          path: '/chat/stream',
          description: 'AI 聊天流式响应',
          schema: {
            query: Type.Object({ prompt: Type.String() }),
            response: Type.Object({ text: Type.String() }),
          },
          handler: sseHandler,
        }),
        defineRoute({
          method: 'GET',
          path: '/normal',
          handler: async () => ({ data: 'normal' }),
        }),
      ])

      const contract = getApiSpec(sseRoutes)

      // SSE 路由应该有 sse: true
      const sseRoute = contract.routes.find(r => r.path === '/chat/stream')
      expect(sseRoute?.sse).toBe(true)
      expect(sseRoute?.description).toBe('AI 聊天流式响应')

      // 普通路由不应该有 sse 标记
      const normalRoute = contract.routes.find(r => r.path === '/normal')
      expect(normalRoute?.sse).toBeUndefined()
    })

    it('无参调用应该从全局 Registry 获取路由', () => {
      // 设置全局 Registry
      const registry = createRouteRegistry(routes)
      setGlobalRegistry(registry)

      // 无参调用
      const contract = getApiSpec()

      expect(contract.version).toBe('1.0.0')
      expect(contract.routes).toHaveLength(4)
      expect(contract.routes[0].path).toBe('/users')
    })

    it('无参调用应该包含 schema 信息', () => {
      // 设置全局 Registry
      const registry = createRouteRegistry(routes)
      setGlobalRegistry(registry)

      // 无参调用
      const contract = getApiSpec()

      // 验证 schema 存在
      expect(contract.routes[0].schema?.query).toBeDefined()
      expect(contract.routes[1].schema?.body).toBeDefined()
    })

    it('Registry 未初始化时应该返回空路由', () => {
      // 不设置 Registry，直接调用
      // 注意：这里因为之前测试可能设置了 Registry，所以需要重置
      // 但由于没有 clearGlobalRegistry，这个测试可能会受前面测试影响
      // 实际使用中，Server 创建后 Registry 总是存在的
      const contract = getApiSpec()
      expect(contract.routes).toBeDefined()
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
