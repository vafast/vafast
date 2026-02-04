import { describe, it, expect } from 'vitest'
import { Type, defineRoute, defineRoutes, Server } from '../../src'

describe('SSE (Server-Sent Events)', () => {
  describe('sse: true 基础功能', () => {
    it('应该正确处理 SSE 端点', async () => {
      const routes = defineRoutes([
        defineRoute({
          method: 'GET',
          path: '/stream',
          sse: true,
          handler: async function* () {
            yield { data: { message: 'hello' } }
          },
        }),
      ])

      const server = new Server(routes)
      const request = new Request('http://localhost/stream')
      const response = await server.fetch(request)

      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
    })

    it('应该支持带 schema 的 SSE 端点', async () => {
      const routes = defineRoutes([
        defineRoute({
          method: 'GET',
          path: '/stream',
          sse: true,
          schema: {
            query: Type.Object({ prompt: Type.String() }),
          },
          handler: async function* ({ query }) {
            yield { data: { prompt: query.prompt } }
          },
        }),
      ])

      const server = new Server(routes)
      const request = new Request('http://localhost/stream?prompt=hello')
      const response = await server.fetch(request)

      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
      const text = await response.text()
      expect(text).toContain('data: {"prompt":"hello"}')
    })
  })

  describe('SSE 响应格式', () => {
    it('应该返回正确的 SSE 响应头', async () => {
      const routes = defineRoutes([
        defineRoute({
          method: 'GET',
          path: '/stream',
          sse: true,
          handler: async function* () {
            yield { data: 'test' }
          },
        }),
      ])

      const server = new Server(routes)
      const request = new Request('http://localhost/stream')
      const response = await server.fetch(request)

      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
      expect(response.headers.get('Cache-Control')).toBe('no-cache')
      expect(response.headers.get('Connection')).toBe('keep-alive')
      expect(response.headers.get('X-Accel-Buffering')).toBe('no')
    })

    it('应该正确格式化 SSE 事件数据', async () => {
      const routes = defineRoutes([
        defineRoute({
          method: 'GET',
          path: '/stream',
          sse: true,
          handler: async function* () {
            yield { data: { message: 'hello' } }
            yield { data: { message: 'world' } }
          },
        }),
      ])

      const server = new Server(routes)
      const request = new Request('http://localhost/stream')
      const response = await server.fetch(request)
      const text = await response.text()

      expect(text).toContain('data: {"message":"hello"}')
      expect(text).toContain('data: {"message":"world"}')
    })

    it('应该支持自定义事件名称', async () => {
      const routes = defineRoutes([
        defineRoute({
          method: 'GET',
          path: '/stream',
          sse: true,
          handler: async function* () {
            yield { event: 'start', data: { status: 'started' } }
            yield { event: 'end', data: { status: 'done' } }
          },
        }),
      ])

      const server = new Server(routes)
      const request = new Request('http://localhost/stream')
      const response = await server.fetch(request)
      const text = await response.text()

      expect(text).toContain('event: start')
      expect(text).toContain('event: end')
    })

    it('应该支持事件 ID 和重试间隔', async () => {
      const routes = defineRoutes([
        defineRoute({
          method: 'GET',
          path: '/stream',
          sse: true,
          handler: async function* () {
            yield { id: '1', retry: 3000, data: 'test' }
          },
        }),
      ])

      const server = new Server(routes)
      const request = new Request('http://localhost/stream')
      const response = await server.fetch(request)
      const text = await response.text()

      expect(text).toContain('id: 1')
      expect(text).toContain('retry: 3000')
    })
  })

  describe('GET + Query 参数', () => {
    it('应该能解析 query 参数', async () => {
      const routes = defineRoutes([
        defineRoute({
          method: 'GET',
          path: '/stream',
          sse: true,
          schema: {
            query: Type.Object({ name: Type.String() }),
          },
          handler: async function* ({ query }) {
            yield { data: { greeting: `Hello ${query.name}` } }
          },
        }),
      ])

      const server = new Server(routes)
      const request = new Request('http://localhost/stream?name=Alice')
      const response = await server.fetch(request)
      const text = await response.text()

      expect(text).toContain('data: {"greeting":"Hello Alice"}')
    })

    it('应该能解析 params 参数', async () => {
      const routes = defineRoutes([
        defineRoute({
          method: 'GET',
          path: '/progress/:id',
          sse: true,
          schema: {
            params: Type.Object({ id: Type.String() }),
          },
          handler: async function* ({ params }) {
            yield { data: { id: params.id, status: 'streaming' } }
          },
        }),
      ])

      const server = new Server(routes)
      const request = new Request('http://localhost/progress/123')
      const response = await server.fetch(request)

      expect(response.headers.get('Content-Type')).toBe('text/event-stream')

      const text = await response.text()
      expect(text).toContain('data: {"id":"123","status":"streaming"}')
    })
  })

  describe('POST + Body（AI 场景）', () => {
    it('应该能解析 POST body', async () => {
      const routes = defineRoutes([
        defineRoute({
          method: 'POST',
          path: '/chat/stream',
          sse: true,
          schema: {
            body: Type.Object({
              message: Type.String(),
            }),
          },
          handler: async function* ({ body }) {
            yield { data: { echo: body.message } }
          },
        }),
      ])

      const server = new Server(routes)
      const request = new Request('http://localhost/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Hello AI' }),
      })
      const response = await server.fetch(request)

      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
      const text = await response.text()
      expect(text).toContain('data: {"echo":"Hello AI"}')
    })

    it('应该同时支持 body 和 headers', async () => {
      const routes = defineRoutes([
        defineRoute({
          method: 'POST',
          path: '/chat/stream',
          sse: true,
          schema: {
            body: Type.Object({
              message: Type.String(),
            }),
          },
          handler: async function* ({ body, headers }) {
            const auth = headers['authorization']
            yield { data: { message: body.message, hasAuth: !!auth } }
          },
        }),
      ])

      const server = new Server(routes)
      const request = new Request('http://localhost/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token123',
        },
        body: JSON.stringify({ message: 'Hello' }),
      })
      const response = await server.fetch(request)
      const text = await response.text()

      expect(text).toContain('"hasAuth":true')
    })
  })

  describe('错误处理', () => {
    it('应该在 generator 抛出错误时发送 error 事件', async () => {
      const routes = defineRoutes([
        defineRoute({
          method: 'GET',
          path: '/stream',
          sse: true,
          handler: async function* () {
            yield { data: 'before error' }
            throw new Error('Something went wrong')
          },
        }),
      ])

      const server = new Server(routes)
      const request = new Request('http://localhost/stream')
      const response = await server.fetch(request)
      const text = await response.text()

      expect(text).toContain('data: before error')
      expect(text).toContain('event: error')
      expect(text).toContain('Something went wrong')
    })

    it('应该在 schema 验证失败时返回 400 错误', async () => {
      const routes = defineRoutes([
        defineRoute({
          method: 'GET',
          path: '/stream',
          sse: true,
          schema: {
            query: Type.Object({ required: Type.String() }),
          },
          handler: async function* () {
            yield { data: 'should not reach' }
          },
        }),
      ])

      const server = new Server(routes)
      const request = new Request('http://localhost/stream') // 缺少 required 参数
      const response = await server.fetch(request)

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.code).toBe(400)
    })

    it('POST body 验证失败应该返回 400', async () => {
      const routes = defineRoutes([
        defineRoute({
          method: 'POST',
          path: '/chat/stream',
          sse: true,
          schema: {
            body: Type.Object({
              message: Type.String(),
            }),
          },
          handler: async function* () {
            yield { data: 'should not reach' }
          },
        }),
      ])

      const server = new Server(routes)
      const request = new Request('http://localhost/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}), // 缺少 message 字段
      })
      const response = await server.fetch(request)

      expect(response.status).toBe(400)
    })
  })

  describe('类型兼容性', () => {
    it('SSE 路由与普通路由可以混合使用', () => {
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
              sse: true,
              schema: { params: Type.Object({ id: Type.String() }) },
              handler: async function* ({ params }) {
                yield { data: { id: params.id } }
              },
            }),
          ],
        }),
      ])

      expect(routes).toHaveLength(2)
      expect(routes[0].path).toBe('/api/normal')
      expect(routes[1].path).toBe('/api/stream/:id')
    })
  })

  describe('实际应用场景', () => {
    it('应该支持进度更新场景', async () => {
      const routes = defineRoutes([
        defineRoute({
          method: 'GET',
          path: '/progress',
          sse: true,
          handler: async function* () {
            for (let i = 0; i <= 100; i += 25) {
              yield { data: { progress: i } }
            }
            yield { event: 'complete', data: { message: 'Done!' } }
          },
        }),
      ])

      const server = new Server(routes)
      const request = new Request('http://localhost/progress')
      const response = await server.fetch(request)
      const text = await response.text()

      expect(text).toContain('"progress":0')
      expect(text).toContain('"progress":25')
      expect(text).toContain('"progress":50')
      expect(text).toContain('"progress":75')
      expect(text).toContain('"progress":100')
      expect(text).toContain('event: complete')
    })

    it('应该支持 AI 聊天流式响应场景', async () => {
      const routes = defineRoutes([
        defineRoute({
          method: 'POST',
          path: '/chat/stream',
          sse: true,
          schema: {
            body: Type.Object({
              message: Type.String(),
            }),
          },
          handler: async function* ({ body }) {
            yield { event: 'start', data: { input: body.message } }
            const words = ['Hello', ' ', 'World', '!']
            for (const word of words) {
              yield { data: { token: word } }
            }
            yield { event: 'done', data: { usage: { tokens: 4 } } }
          },
        }),
      ])

      const server = new Server(routes)
      const request = new Request('http://localhost/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Hi' }),
      })
      const response = await server.fetch(request)
      const text = await response.text()

      expect(text).toContain('event: start')
      expect(text).toContain('"token":"Hello"')
      expect(text).toContain('"token":"World"')
      expect(text).toContain('event: done')
      expect(text).toContain('"tokens":4')
    })
  })
})
