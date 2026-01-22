# Server-Sent Events (SSE)

Vafast 提供了内置的 SSE 支持，用于实现流式响应，如 AI 聊天、实时进度更新、通知推送等场景。

## 快速开始

```typescript
import { createSSEHandler, defineRoute, defineRoutes, Type } from 'vafast'

// 创建 SSE handler
const progressHandler = createSSEHandler(async function* () {
  yield { data: { status: 'started' } }
  
  for (let i = 0; i <= 100; i += 10) {
    yield { data: { progress: i } }
    await sleep(100)
  }
  
  yield { event: 'complete', data: { message: 'Done!' } }
})

// 在 defineRoute 中使用
const routes = defineRoutes([
  defineRoute({
    method: 'GET',
    path: '/progress',
    handler: progressHandler,
  }),
])
```

## 两种使用方式

`createSSEHandler` 支持两种路由定义方式：

### 方式 1: 高层 API（推荐）

与 `defineRoute` 配合使用，支持完整的 schema 验证和类型推断：

```typescript
const sseHandler = createSSEHandler(
  { params: Type.Object({ id: Type.String() }) },
  async function* ({ params }) {
    yield { data: { taskId: params.id } }
    // ... 业务逻辑
  }
)

defineRoute({
  method: 'GET',
  path: '/tasks/:id/stream',
  schema: {
    params: Type.Object({ id: Type.String() }),
  },
  handler: sseHandler,
})
```

### 方式 2: 低层 API

直接与 `route()` 函数配合：

```typescript
const handler = createSSEHandler(async function* ({ req }) {
  const url = new URL(req.url)
  yield { data: { path: url.pathname } }
})

route('GET', '/stream', handler)
```

## SSE 事件格式

每个 `yield` 返回的对象可以包含以下字段：

```typescript
interface SSEEvent {
  event?: string    // 事件名称（可选，默认为 "message"）
  data: unknown     // 事件数据（必需，会自动 JSON 序列化）
  id?: string       // 事件 ID（可选，用于断线重连）
  retry?: number    // 重试间隔（可选，毫秒）
}
```

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

## Schema 验证

可以定义 `params`、`query` 等 schema 进行验证：

```typescript
const chatHandler = createSSEHandler(
  {
    query: Type.Object({
      prompt: Type.String(),
      model: Type.Optional(Type.String()),
    }),
  },
  async function* ({ query }) {
    const { prompt, model = 'gpt-4' } = query
    
    yield { event: 'start', data: { model } }
    
    // 模拟 AI 流式响应
    for (const token of generateTokens(prompt)) {
      yield { data: { token } }
    }
    
    yield { event: 'end', data: { usage: { tokens: 100 } } }
  }
)
```

## 错误处理

### Generator 内部错误

如果 generator 函数抛出错误，会自动发送一个 `error` 事件：

```typescript
const handler = createSSEHandler(async function* () {
  yield { data: 'processing...' }
  throw new Error('Something went wrong')
  // 客户端会收到: event: error
  //              data: {"message":"Something went wrong"}
})
```

### Schema 验证错误

如果 schema 验证失败，会返回 400 错误（JSON 格式）：

```typescript
const handler = createSSEHandler(
  { query: Type.Object({ required: Type.String() }) },
  async function* () { /* ... */ }
)

// 请求 /stream（缺少 required 参数）
// 响应: { "code": 400, "message": "验证失败: ..." }
```

## 实际应用场景

### 1. 视频/文件处理进度

```typescript
const progressHandler = createSSEHandler(
  { params: Type.Object({ taskId: Type.String() }) },
  async function* ({ params }) {
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
      
      await sleep(2000)
    }
  }
)
```

### 2. AI 聊天流式响应

```typescript
const chatStreamHandler = createSSEHandler(
  { 
    query: Type.Object({ 
      message: Type.String(),
      conversationId: Type.Optional(Type.String()),
    }) 
  },
  async function* ({ query }) {
    const { message, conversationId } = query
    
    yield { event: 'start', data: { conversationId } }
    
    const stream = await ai.chat(message)
    
    for await (const chunk of stream) {
      yield { data: { token: chunk.text } }
    }
    
    yield { event: 'end', data: { 
      usage: stream.usage,
      finishReason: stream.finishReason,
    }}
  }
)
```

### 3. 实时通知推送

```typescript
const notificationHandler = createSSEHandler(
  { query: Type.Object({ userId: Type.String() }) },
  async function* ({ query }) {
    const { userId } = query
    
    // 发送心跳保持连接
    const heartbeat = setInterval(() => {
      // 注意：这里需要特殊处理，因为 setInterval 无法直接 yield
    }, 30000)
    
    try {
      for await (const notification of subscribeNotifications(userId)) {
        yield { 
          event: notification.type,
          data: notification.payload,
          id: notification.id,
        }
      }
    } finally {
      clearInterval(heartbeat)
    }
  }
)
```

## 响应头

`createSSEHandler` 会自动设置以下响应头：

| Header | Value | 说明 |
|--------|-------|------|
| `Content-Type` | `text/event-stream` | SSE MIME 类型 |
| `Cache-Control` | `no-cache` | 禁用缓存 |
| `Connection` | `keep-alive` | 保持连接 |
| `X-Accel-Buffering` | `no` | Nginx 禁用缓冲 |

## 客户端使用

### 浏览器原生 EventSource

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

### 注意事项

- `EventSource` **不支持自定义请求头**（如 Authorization）
- 如果需要认证，可以：
  1. 通过 URL 查询参数传递 token：`/stream?token=xxx`
  2. 使用 Cookie 认证
  3. 移除认证要求（适用于只读、需知道 ID 的场景）
  4. 使用 `fetch + ReadableStream` 自己实现

### fetch + ReadableStream（支持认证）

```javascript
async function subscribeSSE(url, token) {
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    
    const text = decoder.decode(value)
    // 解析 SSE 格式: "data: {...}\n\n"
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

## 类型说明

`createSSEHandler` 使用泛型擦除技术，在保证内部完整类型检查的同时，避免复杂类型传播：

```typescript
// ✅ 内部有完整类型检查
createSSEHandler(
  { params: Type.Object({ id: Type.String() }) },
  async function* ({ params }) {
    params.id   // TypeScript 知道这是 string
    params.foo  // ❌ 编译错误：不存在 foo
  }
)

// ✅ 使用 SSE handler 的路由数组不需要类型注解
export const routes = defineRoutes([
  defineRoute({
    path: '/stream/:id',
    handler: createSSEHandler(...),
  }),
])
```

## 最佳实践

1. **定期发送心跳**：防止连接被中间代理断开
2. **使用事件 ID**：支持断线重连时从上次位置继续
3. **设置合理的重试间隔**：避免客户端频繁重连
4. **优雅处理错误**：发送 error 事件后关闭连接
5. **资源清理**：在 generator 结束时清理定时器、数据库连接等
