# Server-Sent Events (SSE)

Vafast 提供了内置的 SSE 支持，用于实现流式响应，如 AI 聊天、实时进度更新、通知推送等场景。

## 快速开始

通过 `sse: true` 显式声明 SSE 端点，handler 使用 `async function*` 语法：

```typescript
import { defineRoute, defineRoutes, Type } from 'vafast'

const routes = defineRoutes([
  defineRoute({
    method: 'GET',
    path: '/progress',
    sse: true,  // 显式声明 SSE 端点
    handler: async function* () {
      yield { data: { status: 'started' } }
      
      for (let i = 0; i <= 100; i += 10) {
        yield { data: { progress: i } }
        await new Promise(r => setTimeout(r, 100))
      }
      
      yield { event: 'complete', data: { message: 'Done!' } }
    },
  }),
])
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
    yield { data: { taskId: params.id } }
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
    
    yield { event: 'start', data: { model } }
    
    for await (const chunk of aiStream(messages)) {
      yield { data: { token: chunk.text } }
    }
    
    yield { event: 'end', data: { usage: { tokens: 100 } } }
  },
})
```

## SSE 事件格式

每个 `yield` 返回的对象可以包含以下字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `data` | `unknown` | 事件数据（必需，会自动 JSON 序列化） |
| `event` | `string` | 事件名称（可选，默认为 "message"） |
| `id` | `string` | 事件 ID（可选，用于断线重连） |
| `retry` | `number` | 重试间隔（可选，毫秒） |

### 示例

```typescript
// 基础数据事件
yield { data: { message: 'Hello' } }
// 输出: data: {"message":"Hello"}

// 命名事件
yield { event: 'status', data: { online: true } }
// 输出: event: status
//       data: {"online":true}

// 带 ID 的事件（支持断线重连）
yield { id: '1001', data: 'checkpoint' }
// 输出: id: 1001
//       data: "checkpoint"

// 自定义重试间隔
yield { retry: 5000, data: 'reconnect in 5s' }
// 输出: retry: 5000
//       data: "reconnect in 5s"
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
    yield { data: 'processing...' }
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
      
      yield { data: { 
        status: task.status,
        progress: task.progress,
      }}
      
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
    
    yield { event: 'start', data: { timestamp: Date.now() } }
    
    for await (const chunk of aiStream(messages)) {
      yield { data: { token: chunk.text } }
    }
    
    yield { event: 'end', data: { 
      usage: { promptTokens: 100, completionTokens: 50 },
    }}
  },
})
```

### 3. 实时通知推送

```typescript
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
      yield { 
        event: notification.type,
        data: notification.payload,
        id: notification.id,
      }
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

1. **使用 `sse: true` 显式声明** — 不依赖运行时检测，更可靠
2. **定期发送心跳** — 防止连接被中间代理断开
3. **使用事件 ID** — 支持断线重连时从上次位置继续
4. **设置合理的重试间隔** — 避免客户端频繁重连
5. **优雅处理错误** — 发送 error 事件后关闭连接
6. **资源清理** — 在 generator 结束时清理定时器、数据库连接等
