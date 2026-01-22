import { describe, it, expect } from 'vitest'
import { createSSEHandler, Type, defineRoute, defineRoutes, Server } from '../../src'

describe('SSE (Server-Sent Events)', () => {
  describe('createSSEHandler 基础功能', () => {
    it('应该创建一个有效的 SSE handler', () => {
      const handler = createSSEHandler(async function* () {
        yield { data: { message: 'hello' } }
      })

      expect(handler).toBeDefined()
      expect(typeof handler).toBe('function')
      expect(handler.__sse).toEqual({ __brand: 'SSE' })
    })

    it('应该支持带 schema 的创建方式', () => {
      const handler = createSSEHandler(
        { query: Type.Object({ prompt: Type.String() }) },
        async function* ({ query }) {
          yield { data: { prompt: query.prompt } }
        }
      )

      expect(handler).toBeDefined()
      expect(handler.__sse).toEqual({ __brand: 'SSE' })
    })
  })

  describe('SSE 响应格式', () => {
    it('应该返回正确的 SSE 响应头', async () => {
      const handler = createSSEHandler(async function* () {
        yield { data: 'test' }
      })

      const request = new Request('http://localhost/stream')
      const response = await handler(request)

      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
      expect(response.headers.get('Cache-Control')).toBe('no-cache')
      expect(response.headers.get('Connection')).toBe('keep-alive')
      expect(response.headers.get('X-Accel-Buffering')).toBe('no')
    })

    it('应该正确格式化 SSE 事件数据', async () => {
      const handler = createSSEHandler(async function* () {
        yield { data: { message: 'hello' } }
        yield { data: { message: 'world' } }
      })

      const request = new Request('http://localhost/stream')
      const response = await handler(request)
      const text = await response.text()

      expect(text).toContain('data: {"message":"hello"}')
      expect(text).toContain('data: {"message":"world"}')
    })

    it('应该支持自定义事件名称', async () => {
      const handler = createSSEHandler(async function* () {
        yield { event: 'start', data: { status: 'started' } }
        yield { event: 'end', data: { status: 'done' } }
      })

      const request = new Request('http://localhost/stream')
      const response = await handler(request)
      const text = await response.text()

      expect(text).toContain('event: start')
      expect(text).toContain('event: end')
    })

    it('应该支持事件 ID 和重试间隔', async () => {
      const handler = createSSEHandler(async function* () {
        yield { id: '1', retry: 3000, data: 'test' }
      })

      const request = new Request('http://localhost/stream')
      const response = await handler(request)
      const text = await response.text()

      expect(text).toContain('id: 1')
      expect(text).toContain('retry: 3000')
    })
  })

  describe('方式 1: 低层 API（直接传入 Request）', () => {
    it('应该能处理 Request 对象', async () => {
      const handler = createSSEHandler(async function* ({ req }) {
        const url = new URL(req.url)
        yield { data: { path: url.pathname } }
      })

      const request = new Request('http://localhost/stream')
      const response = await handler(request)
      const text = await response.text()

      expect(text).toContain('data: {"path":"/stream"}')
    })

    it('应该能解析 query 参数', async () => {
      const handler = createSSEHandler(
        { query: Type.Object({ name: Type.String() }) },
        async function* ({ query }) {
          yield { data: { greeting: `Hello ${query.name}` } }
        }
      )

      const request = new Request('http://localhost/stream?name=Alice')
      const response = await handler(request)
      const text = await response.text()

      expect(text).toContain('data: {"greeting":"Hello Alice"}')
    })
  })

  describe('方式 2: 高层 API（defineRoute + HandlerContext）', () => {
    it('应该能在 defineRoute 中使用 createSSEHandler', async () => {
      const sseHandler = createSSEHandler(
        { params: Type.Object({ id: Type.String() }) },
        async function* ({ params }) {
          yield { data: { id: params.id, status: 'streaming' } }
        }
      )

      const routes = defineRoutes([
        defineRoute({
          method: 'GET',
          path: '/progress/:id',
          schema: {
            params: Type.Object({ id: Type.String() }),
          },
          handler: sseHandler,
        }),
      ])

      const server = new Server(routes)
      const request = new Request('http://localhost/progress/123')
      const response = await server.fetch(request)

      expect(response.headers.get('Content-Type')).toBe('text/event-stream')

      const text = await response.text()
      expect(text).toContain('data: {"id":"123","status":"streaming"}')
    })

    it('应该能在 defineRoute 中解析 query 和 params', async () => {
      const sseHandler = createSSEHandler(
        {
          params: Type.Object({ userId: Type.String() }),
          query: Type.Object({ format: Type.Optional(Type.String()) }),
        },
        async function* ({ params, query }) {
          yield {
            data: {
              userId: params.userId,
              format: query.format || 'json',
            },
          }
        }
      )

      const routes = defineRoutes([
        defineRoute({
          method: 'GET',
          path: '/users/:userId/stream',
          schema: {
            params: Type.Object({ userId: Type.String() }),
            query: Type.Object({ format: Type.Optional(Type.String()) }),
          },
          handler: sseHandler,
        }),
      ])

      const server = new Server(routes)
      const request = new Request('http://localhost/users/456/stream?format=xml')
      const response = await server.fetch(request)
      const text = await response.text()

      expect(text).toContain('"userId":"456"')
      expect(text).toContain('"format":"xml"')
    })
  })

  describe('错误处理', () => {
    it('应该在 generator 抛出错误时发送 error 事件', async () => {
      const handler = createSSEHandler(async function* () {
        yield { data: 'before error' }
        throw new Error('Something went wrong')
      })

      const request = new Request('http://localhost/stream')
      const response = await handler(request)
      const text = await response.text()

      // 注意：字符串类型的 data 不会 JSON 序列化，直接输出
      expect(text).toContain('data: before error')
      expect(text).toContain('event: error')
      expect(text).toContain('Something went wrong')
    })

    it('应该在 schema 验证失败时返回 400 错误', async () => {
      const handler = createSSEHandler(
        { query: Type.Object({ required: Type.String() }) },
        async function* () {
          yield { data: 'should not reach' }
        }
      )

      const request = new Request('http://localhost/stream') // 缺少 required 参数
      const response = await handler(request)

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.code).toBe(400)
    })
  })

  describe('类型兼容性', () => {
    it('使用 createSSEHandler 的 defineRoutes 不需要类型注解', () => {
      // 这个测试验证：使用 SSE handler 的路由数组不需要显式类型注解
      // 如果类型推断有问题，TypeScript 编译会失败
      const sseHandler = createSSEHandler(
        { params: Type.Object({ id: Type.String() }) },
        async function* ({ params }) {
          yield { data: { id: params.id } }
        }
      )

      // 无类型注解，直接 export（模拟实际使用场景）
      const routes = defineRoutes([
        defineRoute({
          path: '/api',
          children: [
            defineRoute({
              method: 'GET',
              path: '/normal',
              handler: () => ({ message: 'ok' }),
            }),
            defineRoute({
              method: 'GET',
              path: '/stream/:id',
              schema: { params: Type.Object({ id: Type.String() }) },
              handler: sseHandler,
            }),
          ],
        }),
      ])

      // 验证路由数组正确生成
      expect(routes).toHaveLength(2)
      expect(routes[0].path).toBe('/api/normal')
      expect(routes[1].path).toBe('/api/stream/:id')
    })
  })

  describe('实际应用场景', () => {
    it('应该支持进度更新场景', async () => {
      const handler = createSSEHandler(async function* () {
        for (let i = 0; i <= 100; i += 25) {
          yield { data: { progress: i } }
        }
        yield { event: 'complete', data: { message: 'Done!' } }
      })

      const request = new Request('http://localhost/progress')
      const response = await handler(request)
      const text = await response.text()

      expect(text).toContain('"progress":0')
      expect(text).toContain('"progress":25')
      expect(text).toContain('"progress":50')
      expect(text).toContain('"progress":75')
      expect(text).toContain('"progress":100')
      expect(text).toContain('event: complete')
    })

    it('应该支持 AI 聊天流式响应场景', async () => {
      const handler = createSSEHandler(async function* () {
        const words = ['Hello', ' ', 'World', '!']
        for (const word of words) {
          yield { data: { token: word } }
        }
        yield { event: 'done', data: { usage: { tokens: 4 } } }
      })

      const request = new Request('http://localhost/chat/stream')
      const response = await handler(request)
      const text = await response.text()

      expect(text).toContain('"token":"Hello"')
      expect(text).toContain('"token":"World"')
      expect(text).toContain('event: done')
      expect(text).toContain('"tokens":4')
    })
  })
})
