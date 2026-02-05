# Server-Sent Events (SSE)

Vafast 提供了内置的 SSE 支持，用于实现流式响应，如 AI 聊天、实时进度更新、通知推送等场景。

## 快速开始

通过 `sse: true` 显式声明 SSE 端点，handler 使用 `async function*` 语法。直接 `yield` 任意数据，框架自动包装为 SSE 格式：

```typescript
import { defineRoute, defineRoutes, Type, sse } from 'vafast'

const routes = defineRoutes([
  defineRoute({
    method: 'GET',
    path: '/progress',
    sse: true,
    handler: async function* () {
      // 直接 yield 数据，框架自动包装为 SSE data 字段
      yield { status: 'started' }
      
      for (let i = 0; i <= 100; i += 10) {
        yield { progress: i }
        await new Promise(r => setTimeout(r, 100))
      }
      
      // 需要自定义事件名时，使用 sse() 函数
      yield sse({ event: 'complete' }, { message: 'Done!' })
    },
  }),
])
```

## 两种使用模式

### 简单模式（推荐）

直接 `yield` 任意数据，框架自动序列化为 SSE `data` 字段：

```typescript
// yield 对象
yield { type: 'text_delta', content: 'Hello' }
// 输出: data: {"type":"text_delta","content":"Hello"}

// yield 字符串
yield 'Hello World'
// 输出: data: Hello World

// yield 数字
yield 42
// 输出: data: 42
```

### 高级模式

需要设置 SSE 的 `event`、`id`、`retry` 元数据时，使用 `sse()` 函数：

```typescript
import { sse } from 'vafast'

// 自定义事件名称
yield sse({ event: 'status' }, { online: true })
// 输出: event: status
//       data: {"online":true}

// 带 ID（支持断线重连）
yield sse({ id: '1001' }, { value: 1 })
// 输出: id: 1001
//       data: {"value":1}

// 自定义重试间隔
yield sse({ retry: 5000 }, 'reconnect')
// 输出: retry: 5000
//       data: reconnect

// 完整配置
yield sse({ event: 'update', id: '42', retry: 3000 }, { count: 1 })
// 输出: id: 42
//       event: update
//       retry: 3000
//       data: {"count":1}
```

## 基础用法

### GET + Query 参数

适用于简单的订阅场景：

```typescript
defineRoute({
  method: 'GET',
  path: '/tasks/:id/stream',
  sse: true,
  schema: {
    params: Type.Object({ id: Type.String() }),
  },
  handler: async function* ({ params }) {
    yield { taskId: params.id, status: 'streaming' }
    // ... 业务逻辑
  },
})
```

### POST + Body（AI 场景）

适用于需要发送复杂数据的场景（如 AI 聊天）：

```typescript
defineRoute({
  method: 'POST',
  path: '/chat/stream',
  sse: true,
  schema: {
    body: Type.Object({
      messages: Type.Array(Type.Object({
        role: Type.String(),
        content: Type.String(),
      })),
      model: Type.Optional(Type.String()),
    }),
  },
  handler: async function* ({ body }) {
    const { messages, model = 'gpt-4' } = body
    
    // 简单模式：直接 yield AI 事件
    yield { type: 'start', model }
    
    for await (const chunk of aiStream(messages)) {
      yield { type: 'text_delta', content: chunk.text }
    }
    
    yield { type: 'done', usage: { tokens: 100 } }
  },
})
```

## 错误处理

### Generator 内部错误

如果 generator 函数抛出错误，会自动发送一个 `error` 事件：

```typescript
defineRoute({
  method: 'GET',
  path: '/stream',
  sse: true,
  handler: async function* () {
    yield { status: 'processing' }
    throw new Error('Something went wrong')
    // 客户端会收到: event: error
    //              data: {"error":"Something went wrong"}
  },
})
```

### Schema 验证错误

如果 schema 验证失败，会返回 400 错误（JSON 格式）：

```typescript
defineRoute({
  method: 'GET',
  path: '/stream',
  sse: true,
  schema: { query: Type.Object({ required: Type.String() }) },
  handler: async function* () { /* ... */ },
})

// 请求 /stream（缺少 required 参数）
// 响应: { "code": 400, "message": "验证失败: ..." }
```

## 实际应用场景

### 1. 视频/文件处理进度

```typescript
defineRoute({
  method: 'GET',
  path: '/tasks/:taskId/progress',
  sse: true,
  schema: {
    params: Type.Object({ taskId: Type.String() }),
  },
  handler: async function* ({ params }) {
    const { taskId } = params
    
    while (true) {
      const task = await getTask(taskId)
      
      yield { 
        status: task.status,
        progress: task.progress,
      }
      
      if (task.status === 'completed' || task.status === 'failed') {
        return
      }
      
      await new Promise(r => setTimeout(r, 2000))
    }
  },
})
```

### 2. AI 聊天流式响应

```typescript
defineRoute({
  method: 'POST',
  path: '/chat/stream',
  sse: true,
  schema: {
    body: Type.Object({
      messages: Type.Array(Type.Object({
        role: Type.Union([Type.Literal('user'), Type.Literal('assistant')]),
        content: Type.String(),
      })),
    }),
  },
  handler: async function* ({ body }) {
    const { messages } = body
    
    // 使用简单模式，直接 yield ChatEvent 格式
    yield { type: 'start', timestamp: Date.now() }
    
    for await (const chunk of aiStream(messages)) {
      yield { type: 'text_delta', content: chunk.text }
    }
    
    yield { 
      type: 'done', 
      usage: { promptTokens: 100, completionTokens: 50 },
    }
  },
})
```

### 3. 实时通知推送

```typescript
import { sse } from 'vafast'

defineRoute({
  method: 'GET',
  path: '/notifications/stream',
  sse: true,
  schema: {
    query: Type.Object({ userId: Type.String() }),
  },
  handler: async function* ({ query }) {
    const { userId } = query
    
    for await (const notification of subscribeNotifications(userId)) {
      // 使用 sse() 设置事件名和 ID
      yield sse(
        { event: notification.type, id: notification.id },
        notification.payload
      )
    }
  },
})
```

## 响应头

SSE 端点会自动设置以下响应头：

| Header | Value | 说明 |
|--------|-------|------|
| `Content-Type` | `text/event-stream` | SSE MIME 类型 |
| `Cache-Control` | `no-cache` | 禁用缓存 |
| `Connection` | `keep-alive` | 保持连接 |
| `X-Accel-Buffering` | `no` | Nginx 禁用缓冲 |

## 客户端使用

### 浏览器原生 EventSource（GET 请求）

```javascript
const eventSource = new EventSource('/api/progress/123')

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data)
  console.log('Progress:', data.progress)
}

eventSource.addEventListener('complete', (event) => {
  console.log('Done!')
  eventSource.close()
})

eventSource.onerror = (error) => {
  console.error('Error:', error)
}
```

### fetch + ReadableStream（支持 POST 和认证）

```javascript
async function subscribeSSE(url, body, token) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
  
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    
    const text = decoder.decode(value)
    const lines = text.split('\n')
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6))
        console.log('Received:', data)
      }
    }
  }
}
```

## 最佳实践

1. **直接 yield 数据** — 简单模式覆盖 90% 场景，代码更简洁
2. **需要 event/id/retry 时用 `sse()`** — 高级模式提供完整控制
3. **定期发送心跳** — 防止连接被中间代理断开
4. **使用事件 ID** — 支持断线重连时从上次位置继续
5. **设置合理的重试间隔** — 避免客户端频繁重连
6. **优雅处理错误** — 框架自动发送 error 事件
7. **资源清理** — 在 generator 结束时清理定时器、数据库连接等
