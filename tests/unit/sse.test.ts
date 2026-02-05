import { describe, it, expect } from 'vitest'
import { Type, defineRoute, defineRoutes, defineMiddleware, Server, sse } from '../../src'

describe('SSE (Server-Sent Events)', () => {
  describe('简单模式（推荐）', () => {
    it('直接 yield 数据，自动包装为 SSE data', async () => {
      const routes = defineRoutes([
        defineRoute({
          method: 'GET',
          path: '/stream',
          sse: true,
          handler: async function* () {
            yield { message: 'hello' }
            yield { message: 'world' }
          },
        }),
      ])

      const server = new Server(routes)
      const request = new Request('http://localhost/stream')
      const response = await server.fetch(request)

      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
      const text = await response.text()
      expect(text).toContain('data: {"message":"hello"}')
      expect(text).toContain('data: {"message":"world"}')
    })

    it('支持 yield 字符串', async () => {
      const routes = defineRoutes([
        defineRoute({
          method: 'GET',
          path: '/stream',
          sse: true,
          handler: async function* () {
            yield 'hello'
            yield 'world'
          },
        }),
      ])

      const server = new Server(routes)
      const request = new Request('http://localhost/stream')
      const response = await server.fetch(request)
      const text = await response.text()

      expect(text).toContain('data: hello')
      expect(text).toContain('data: world')
    })

    it('支持 yield 数字', async () => {
      const routes = defineRoutes([
        defineRoute({
          method: 'GET',
          path: '/stream',
          sse: true,
          handler: async function* () {
            yield 1
            yield 2
            yield 3
          },
        }),
      ])

      const server = new Server(routes)
      const request = new Request('http://localhost/stream')
      const response = await server.fetch(request)
      const text = await response.text()

      expect(text).toContain('data: 1')
      expect(text).toContain('data: 2')
      expect(text).toContain('data: 3')
    })
  })

  describe('高级模式（sse 函数）', () => {
    it('支持自定义事件名称', async () => {
      const routes = defineRoutes([
        defineRoute({
          method: 'GET',
          path: '/stream',
          sse: true,
          handler: async function* () {
            yield sse({ event: 'start' }, { status: 'started' })
            yield sse({ event: 'end' }, { status: 'done' })
          },
        }),
      ])

      const server = new Server(routes)
      const request = new Request('http://localhost/stream')
      const response = await server.fetch(request)
      const text = await response.text()

      expect(text).toContain('event: start')
      expect(text).toContain('data: {"status":"started"}')
      expect(text).toContain('event: end')
      expect(text).toContain('data: {"status":"done"}')
    })

    it('支持事件 ID 和重试间隔', async () => {
      const routes = defineRoutes([
        defineRoute({
          method: 'GET',
          path: '/stream',
          sse: true,
          handler: async function* () {
            yield sse({ id: '1', retry: 3000 }, 'test')
          },
        }),
      ])

      const server = new Server(routes)
      const request = new Request('http://localhost/stream')
      const response = await server.fetch(request)
      const text = await response.text()

      expect(text).toContain('id: 1')
      expect(text).toContain('retry: 3000')
      expect(text).toContain('data: test')
    })

    it('支持完整的 SSE 元数据', async () => {
      const routes = defineRoutes([
        defineRoute({
          method: 'GET',
          path: '/stream',
          sse: true,
          handler: async function* () {
            yield sse({ event: 'message', id: '42', retry: 5000 }, { content: 'hello' })
          },
        }),
      ])

      const server = new Server(routes)
      const request = new Request('http://localhost/stream')
      const response = await server.fetch(request)
      const text = await response.text()

      expect(text).toContain('id: 42')
      expect(text).toContain('event: message')
      expect(text).toContain('retry: 5000')
      expect(text).toContain('data: {"content":"hello"}')
    })
  })

  describe('SSE 响应头', () => {
    it('应该返回正确的 SSE 响应头', async () => {
      const routes = defineRoutes([
        defineRoute({
          method: 'GET',
          path: '/stream',
          sse: true,
          handler: async function* () {
            yield 'test'
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
  })

  describe('Schema 验证', () => {
    it('应该支持 query 参数', async () => {
      const routes = defineRoutes([
        defineRoute({
          method: 'GET',
          path: '/stream',
          sse: true,
          schema: {
            query: Type.Object({ name: Type.String() }),
          },
          handler: async function* ({ query }) {
            yield { greeting: `Hello ${query.name}` }
          },
        }),
      ])

      const server = new Server(routes)
      const request = new Request('http://localhost/stream?name=Alice')
      const response = await server.fetch(request)
      const text = await response.text()

      expect(text).toContain('data: {"greeting":"Hello Alice"}')
    })

    it('应该支持 params 参数', async () => {
      const routes = defineRoutes([
        defineRoute({
          method: 'GET',
          path: '/progress/:id',
          sse: true,
          schema: {
            params: Type.Object({ id: Type.String() }),
          },
          handler: async function* ({ params }) {
            yield { id: params.id, status: 'streaming' }
          },
        }),
      ])

      const server = new Server(routes)
      const request = new Request('http://localhost/progress/123')
      const response = await server.fetch(request)
      const text = await response.text()

      expect(text).toContain('data: {"id":"123","status":"streaming"}')
    })

    it('应该支持 POST body', async () => {
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
            yield { echo: body.message }
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
      const text = await response.text()

      expect(text).toContain('data: {"echo":"Hello AI"}')
    })

    it('query 验证失败应该返回 400', async () => {
      const routes = defineRoutes([
        defineRoute({
          method: 'GET',
          path: '/stream',
          sse: true,
          schema: {
            query: Type.Object({ required: Type.String() }),
          },
          handler: async function* () {
            yield 'should not reach'
          },
        }),
      ])

      const server = new Server(routes)
      const request = new Request('http://localhost/stream')
      const response = await server.fetch(request)

      expect(response.status).toBe(400)
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
            yield 'should not reach'
          },
        }),
      ])

      const server = new Server(routes)
      const request = new Request('http://localhost/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const response = await server.fetch(request)

      expect(response.status).toBe(400)
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
            yield 'before error'
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
  })

  describe('实际应用场景', () => {
    it('进度更新场景', async () => {
      const routes = defineRoutes([
        defineRoute({
          method: 'GET',
          path: '/progress',
          sse: true,
          handler: async function* () {
            for (let i = 0; i <= 100; i += 25) {
              yield { progress: i }
            }
            yield sse({ event: 'complete' }, { message: 'Done!' })
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

    it('AI 聊天流式响应场景', async () => {
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
            // 直接 yield ChatEvent 格式的数据
            yield { type: 'start', input: body.message }
            
            const words = ['Hello', ' ', 'World', '!']
            for (const word of words) {
              yield { type: 'text_delta', content: word }
            }
            
            yield { type: 'done', usage: { tokens: 4 } }
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

      // 验证数据被正确发送（整个对象作为 data）
      expect(text).toContain('"type":"start"')
      expect(text).toContain('"type":"text_delta"')
      expect(text).toContain('"content":"Hello"')
      expect(text).toContain('"content":"World"')
      expect(text).toContain('"type":"done"')
      expect(text).toContain('"tokens":4')
    })

    it('混合简单模式和高级模式', async () => {
      const routes = defineRoutes([
        defineRoute({
          method: 'GET',
          path: '/mixed',
          sse: true,
          handler: async function* () {
            // 高级模式：带事件名
            yield sse({ event: 'init' }, { status: 'ready' })
            
            // 简单模式：直接发数据
            yield { type: 'data', value: 1 }
            yield { type: 'data', value: 2 }
            
            // 高级模式：带 ID
            yield sse({ event: 'end', id: 'final' }, { done: true })
          },
        }),
      ])

      const server = new Server(routes)
      const request = new Request('http://localhost/mixed')
      const response = await server.fetch(request)
      const text = await response.text()

      expect(text).toContain('event: init')
      expect(text).toContain('"type":"data"')
      expect(text).toContain('"value":1')
      expect(text).toContain('"value":2')
      expect(text).toContain('event: end')
      expect(text).toContain('id: final')
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
                yield { id: params.id }
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

  describe('边界值测试', () => {
    it('yield null 应该正确处理', async () => {
      const routes = defineRoutes([
        defineRoute({
          method: 'GET',
          path: '/stream',
          sse: true,
          handler: async function* () {
            yield null
            yield { after: 'null' }
          },
        }),
      ])

      const server = new Server(routes)
      const response = await server.fetch(new Request('http://localhost/stream'))
      const text = await response.text()

      expect(text).toContain('data: null')
      expect(text).toContain('data: {"after":"null"}')
    })

    it('yield undefined 会触发错误（不建议使用）', async () => {
      const routes = defineRoutes([
        defineRoute({
          method: 'GET',
          path: '/stream',
          sse: true,
          handler: async function* () {
            yield undefined
          },
        }),
      ])

      const server = new Server(routes)
      const response = await server.fetch(new Request('http://localhost/stream'))
      const text = await response.text()

      // undefined 无法 JSON 序列化，会触发错误事件
      expect(text).toContain('event: error')
    })

    it('yield 数组应该正确处理', async () => {
      const routes = defineRoutes([
        defineRoute({
          method: 'GET',
          path: '/stream',
          sse: true,
          handler: async function* () {
            yield [1, 2, 3]
            yield ['a', 'b']
          },
        }),
      ])

      const server = new Server(routes)
      const response = await server.fetch(new Request('http://localhost/stream'))
      const text = await response.text()

      expect(text).toContain('data: [1,2,3]')
      expect(text).toContain('data: ["a","b"]')
    })

    it('yield 布尔值应该正确处理', async () => {
      const routes = defineRoutes([
        defineRoute({
          method: 'GET',
          path: '/stream',
          sse: true,
          handler: async function* () {
            yield true
            yield false
          },
        }),
      ])

      const server = new Server(routes)
      const response = await server.fetch(new Request('http://localhost/stream'))
      const text = await response.text()

      expect(text).toContain('data: true')
      expect(text).toContain('data: false')
    })

    it('多行数据应该正确处理', async () => {
      const routes = defineRoutes([
        defineRoute({
          method: 'GET',
          path: '/stream',
          sse: true,
          handler: async function* () {
            yield 'line1\nline2\nline3'
          },
        }),
      ])

      const server = new Server(routes)
      const response = await server.fetch(new Request('http://localhost/stream'))
      const text = await response.text()

      // SSE 规范：多行数据每行都需要 data: 前缀
      expect(text).toContain('data: line1')
      expect(text).toContain('data: line2')
      expect(text).toContain('data: line3')
    })

    it('空 generator 应该正常完成', async () => {
      const routes = defineRoutes([
        defineRoute({
          method: 'GET',
          path: '/stream',
          sse: true,
          handler: async function* () {
            // 不 yield 任何东西
          },
        }),
      ])

      const server = new Server(routes)
      const response = await server.fetch(new Request('http://localhost/stream'))
      
      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
      const text = await response.text()
      expect(text).toBe('')
    })
  })

  describe('HTTP 方法支持', () => {
    it('PUT SSE 应该正常工作', async () => {
      const routes = defineRoutes([
        defineRoute({
          method: 'PUT',
          path: '/resource/:id',
          sse: true,
          schema: {
            params: Type.Object({ id: Type.String() }),
            body: Type.Object({ data: Type.String() }),
          },
          handler: async function* ({ params, body }) {
            yield { status: 'updating', id: params.id }
            yield { status: 'done', data: body.data }
          },
        }),
      ])

      const server = new Server(routes)
      const response = await server.fetch(new Request('http://localhost/resource/123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: 'updated' }),
      }))
      const text = await response.text()

      expect(text).toContain('"status":"updating"')
      expect(text).toContain('"id":"123"')
      expect(text).toContain('"status":"done"')
    })

    it('PATCH SSE 应该正常工作', async () => {
      const routes = defineRoutes([
        defineRoute({
          method: 'PATCH',
          path: '/resource/:id',
          sse: true,
          handler: async function* () {
            yield { patching: true }
            yield { patched: true }
          },
        }),
      ])

      const server = new Server(routes)
      const response = await server.fetch(new Request('http://localhost/resource/123', {
        method: 'PATCH',
      }))
      const text = await response.text()

      expect(text).toContain('"patching":true')
      expect(text).toContain('"patched":true')
    })

    it('DELETE SSE 应该正常工作（批量删除进度）', async () => {
      const routes = defineRoutes([
        defineRoute({
          method: 'DELETE',
          path: '/batch',
          sse: true,
          schema: {
            body: Type.Object({ ids: Type.Array(Type.String()) }),
          },
          handler: async function* ({ body }) {
            for (let i = 0; i < body.ids.length; i++) {
              yield { deleted: body.ids[i], progress: i + 1, total: body.ids.length }
            }
            yield sse({ event: 'complete' }, { success: true })
          },
        }),
      ])

      const server = new Server(routes)
      const response = await server.fetch(new Request('http://localhost/batch', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: ['a', 'b', 'c'] }),
      }))
      const text = await response.text()

      expect(text).toContain('"deleted":"a"')
      expect(text).toContain('"deleted":"b"')
      expect(text).toContain('"deleted":"c"')
      expect(text).toContain('event: complete')
    })
  })

  describe('中间件集成', () => {
    it('SSE 路由应该支持中间件', async () => {
      const logs: string[] = []
      
      const loggingMiddleware = defineMiddleware(async (req, next) => {
        logs.push(`before: ${req.url}`)
        const response = await next()
        logs.push(`after: ${response.status}`)
        return response
      })

      const routes = defineRoutes([
        defineRoute({
          method: 'GET',
          path: '/stream',
          sse: true,
          middleware: [loggingMiddleware],
          handler: async function* () {
            yield { data: 'test' }
          },
        }),
      ])

      const server = new Server(routes)
      const response = await server.fetch(new Request('http://localhost/stream'))
      await response.text()

      expect(logs).toContain('before: http://localhost/stream')
      expect(logs.some(log => log.startsWith('after:'))).toBe(true)
    })

    it('中间件可以修改 SSE 响应头', async () => {
      const addHeaderMiddleware = defineMiddleware(async (_req, next) => {
        const response = await next()
        response.headers.set('X-Custom-Header', 'custom-value')
        return response
      })

      const routes = defineRoutes([
        defineRoute({
          method: 'GET',
          path: '/stream',
          sse: true,
          middleware: [addHeaderMiddleware],
          handler: async function* () {
            yield 'test'
          },
        }),
      ])

      const server = new Server(routes)
      const response = await server.fetch(new Request('http://localhost/stream'))

      expect(response.headers.get('X-Custom-Header')).toBe('custom-value')
      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
    })
  })

  describe('sse() 函数边界测试', () => {
    it('空 meta 对象应该只发送 data', async () => {
      const routes = defineRoutes([
        defineRoute({
          method: 'GET',
          path: '/stream',
          sse: true,
          handler: async function* () {
            yield sse({}, { message: 'hello' })
          },
        }),
      ])

      const server = new Server(routes)
      const response = await server.fetch(new Request('http://localhost/stream'))
      const text = await response.text()

      expect(text).toBe('data: {"message":"hello"}\n\n')
    })

    it('只有 event 的 meta', async () => {
      const routes = defineRoutes([
        defineRoute({
          method: 'GET',
          path: '/stream',
          sse: true,
          handler: async function* () {
            yield sse({ event: 'ping' }, 'pong')
          },
        }),
      ])

      const server = new Server(routes)
      const response = await server.fetch(new Request('http://localhost/stream'))
      const text = await response.text()

      expect(text).toContain('event: ping')
      expect(text).toContain('data: pong')
      expect(text).not.toContain('id:')
      expect(text).not.toContain('retry:')
    })

    it('只有 id 的 meta', async () => {
      const routes = defineRoutes([
        defineRoute({
          method: 'GET',
          path: '/stream',
          sse: true,
          handler: async function* () {
            yield sse({ id: 'msg-001' }, { seq: 1 })
          },
        }),
      ])

      const server = new Server(routes)
      const response = await server.fetch(new Request('http://localhost/stream'))
      const text = await response.text()

      expect(text).toContain('id: msg-001')
      expect(text).toContain('data: {"seq":1}')
      expect(text).not.toContain('event:')
      expect(text).not.toContain('retry:')
    })

    it('只有 retry 的 meta', async () => {
      const routes = defineRoutes([
        defineRoute({
          method: 'GET',
          path: '/stream',
          sse: true,
          handler: async function* () {
            yield sse({ retry: 10000 }, 'reconnect hint')
          },
        }),
      ])

      const server = new Server(routes)
      const response = await server.fetch(new Request('http://localhost/stream'))
      const text = await response.text()

      expect(text).toContain('retry: 10000')
      expect(text).toContain('data: reconnect hint')
      expect(text).not.toContain('event:')
      expect(text).not.toContain('id:')
    })

    it('sse() data 可以是任意类型', async () => {
      const routes = defineRoutes([
        defineRoute({
          method: 'GET',
          path: '/stream',
          sse: true,
          handler: async function* () {
            yield sse({ event: 'string' }, 'hello')
            yield sse({ event: 'number' }, 42)
            yield sse({ event: 'boolean' }, true)
            yield sse({ event: 'array' }, [1, 2, 3])
            yield sse({ event: 'object' }, { key: 'value' })
            yield sse({ event: 'null' }, null)
          },
        }),
      ])

      const server = new Server(routes)
      const response = await server.fetch(new Request('http://localhost/stream'))
      const text = await response.text()

      expect(text).toContain('event: string')
      expect(text).toContain('data: hello')
      expect(text).toContain('event: number')
      expect(text).toContain('data: 42')
      expect(text).toContain('event: boolean')
      expect(text).toContain('data: true')
      expect(text).toContain('event: array')
      expect(text).toContain('data: [1,2,3]')
      expect(text).toContain('event: object')
      expect(text).toContain('data: {"key":"value"}')
      expect(text).toContain('event: null')
      expect(text).toContain('data: null')
    })
  })
})
