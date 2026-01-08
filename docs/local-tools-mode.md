# Vafast 本地工具模式

## 核心洞察

传统理解中，路由 = HTTP 服务配置。

但声明式路由的本质是：

```
声明式路由 = 能力描述（数据）
           ≠ HTTP 服务（运行时）
```

路由配置只是在回答：**"我能做什么？参数是什么？"**

至于怎么运行，可以是：
- HTTP 服务（网络调用）
- 本地函数调用（无网络）
- CLI 命令
- WebSocket 消息
- 纯文档

---

## 架构对比

### 传统方式（紧耦合）

```
路由定义 ←→ HTTP 服务 ←→ 网络 ←→ 客户端
                ↑
           强绑定，无法分离
```

### 声明式方式（松耦合）

```
          声明式路由配置（纯数据）
                    │
       ┌────────────┼────────────┬────────────┐
       ▼            ▼            ▼            ▼
   HTTP 适配器   本地适配器   CLI 适配器   AI Tools
       │            │            │            │
   网络服务    直接函数调用   命令行工具   AI Agent
```

**核心价值**：一份配置，多种运行方式。

---

## 为什么链式做不到？

链式路由天然与 HTTP 绑定，难以实现本地工具模式。

### 问题 1：Handler 依赖 Request 对象

```typescript
// 声明式 - handler 可以是纯函数
const routes = [
  {
    name: 'calculate',
    params: z.object({ a: z.number(), b: z.number() }),
    handler: ({ a, b }) => a + b  // 纯函数，输入输出都是普通数据
  }
]

// 本地调用，简单直接
const result = execute('calculate', { a: 1, b: 2 })  // 返回 3
```

```typescript
// 链式 - handler 依赖 Request/Response
app.get('/calculate', (req) => {
  const a = Number(req.query.get('a'))  // 依赖 Request
  const b = Number(req.query.get('b'))
  return Response.json(a + b)           // 返回 Response
})

// 本地调用？必须构造假的 Request
const fakeReq = new Request('http://x/calculate?a=1&b=2')
const response = await handler(fakeReq)
const result = await response.json()  // 还要解析 Response

// 太别扭了...
```

### 问题 2：Schema 藏在函数内部

```typescript
// 声明式 - Schema 是数据的一部分，外部可见
{
  name: 'createOrder',
  body: z.object({
    productId: z.string(),
    quantity: z.number().min(1),
  }),
  handler: createOrder
}

// 转换为 AI Tools 时可以直接读取 Schema
const tools = routesToTools(routes)  // ✅ 能拿到参数定义
```

```typescript
// 链式 - Schema 在函数里，外部看不到
app.post('/orders', (req) => {
  const body = OrderSchema.parse(await req.json())  // Schema 在里面
  // ...
})

// 转换为 AI Tools？拿不到参数定义
// AI 不知道需要传什么参数
```

### 问题 3：描述信息无处可放

```typescript
// 声明式 - 描述是数据字段
{
  name: 'searchProducts',
  description: '搜索商品，支持关键词和价格筛选',  // AI 能读到
  params: z.object({ keyword: z.string() }),
  handler: searchProducts
}
```

```typescript
// 链式 - 描述写在哪？
app.get('/products', searchProducts)  // 没地方写 description

// 加第三个参数？
app.get('/products', searchProducts, { description: '...' })
// 越来越像声明式了...
```

### 问题 4：无法序列化

```typescript
// 声明式 - 纯数据，可以存储、传输
const routes = [
  { name: 'getUser', path: '/users/:id', ... }
]

// 存到配置中心
await configCenter.set('routes', JSON.stringify(routes))  // ✅

// 热更新
const newRoutes = await configCenter.get('routes')
app.updateRoutes(JSON.parse(newRoutes))  // ✅
```

```typescript
// 链式 - 包含函数引用，无法序列化
const app = vafast().get('/users/:id', getUser)

JSON.stringify(app.getRoutes())  
// ❌ TypeError: Converting circular structure to JSON
// 函数无法转成 JSON

// 无法存到配置中心
// 无法热更新
// 无法跨进程传递
```

### 问题 5：静态分析困难

```typescript
// 声明式 - 不用运行就能分析
const routes = [...] // 静态数据

// 构建时检查
checkRouteConflicts(routes)     // ✅ 不需要启动服务
generateOpenAPI(routes)          // ✅ 不需要启动服务
routesToTools(routes)            // ✅ 不需要启动服务
```

```typescript
// 链式 - 必须执行代码才能获取路由
const app = vafast()
  .get('/users', listUsers)
  .post('/users', createUser)

// 要获取路由，必须先运行这段代码
const routes = app.getRoutes()  // 需要执行

// CI/CD 检查、文档生成都需要启动应用
```

### 对比总结

| 能力 | 声明式 | 链式 |
|------|--------|------|
| Handler 类型 | 纯函数 | 依赖 Request |
| Schema 位置 | 外部可见 | 藏在函数内 |
| 描述信息 | 数据字段 | 无处可放 |
| 序列化 | ✅ JSON | ❌ 含函数 |
| 静态分析 | ✅ 不需运行 | ❌ 需执行代码 |
| 本地执行 | ✅ 自然 | ❌ 别扭 |
| 热更新 | ✅ 替换数据 | ❌ 需重启 |

### 结论

> **链式路由的设计假设是：路由 = HTTP 服务**
>
> **声明式路由的设计假设是：路由 = 能力描述**
>
> 本地工具模式需要「脱离 HTTP」，所以必须用声明式。

---

## 本地工具模式

### 基本概念

```typescript
// routes.ts - 纯数据描述 + 本地实现
const routes = [
  {
    name: 'calculateTax',
    description: '计算税费',
    params: z.object({ 
      amount: z.number().describe('金额'),
      rate: z.number().describe('税率'),
    }),
    // handler 就是普通函数，不需要 Request/Response
    handler: ({ amount, rate }) => amount * rate,
  },
  {
    name: 'formatDate',
    description: '格式化日期',
    params: z.object({ 
      date: z.string(),
      format: z.string().default('YYYY-MM-DD'),
    }),
    handler: ({ date, format }) => dayjs(date).format(format),
  },
  {
    name: 'queryDatabase',
    description: '查询数据库',
    params: z.object({ sql: z.string() }),
    handler: async ({ sql }) => await db.query(sql),
  }
]
```

### 不同运行模式

#### 模式 1：作为 HTTP 服务

```typescript
// 传统用法，通过网络调用
import { vafast } from 'vafast'

const app = vafast().addRoutes(routes)

export default { fetch: app.fetch }
// curl http://localhost:3000/calculateTax?amount=100&rate=0.1
```

#### 模式 2：作为本地 AI 工具

```typescript
// 不启动服务，直接本地调用
import { routesToTools, createLocalExecutor } from 'vafast/ai'

const tools = routesToTools(routes)
const execute = createLocalExecutor(routes)

// AI 调用时直接执行本地函数
const result = await execute('calculateTax', { amount: 100, rate: 0.1 })
// 返回 10，没有网络开销
```

#### 模式 3：作为 CLI 工具

```bash
# 自动生成命令行
$ vafast calculateTax --amount 100 --rate 0.1
# 输出：10

$ vafast formatDate --date "2024-01-15" --format "MM月DD日"
# 输出：01月15日
```

#### 模式 4：混合模式

```typescript
// 部分本地执行，部分代理到远程
const routes = [
  {
    name: 'localCalculation',
    mode: 'local',  // 本地执行
    handler: (args) => compute(args),
  },
  {
    name: 'remoteAPI',
    mode: 'proxy',  // 代理到远程服务
    upstream: 'https://api.example.com/endpoint',
  }
]
```

---

## 本地执行器实现

### 核心代码

```typescript
import { z } from 'zod'

interface LocalRoute {
  name: string
  description?: string
  params?: z.ZodType
  handler: (args: unknown) => unknown | Promise<unknown>
}

/**
 * 创建本地执行器
 * 直接调用 handler，不经过网络
 */
export function createLocalExecutor(routes: LocalRoute[]) {
  // 构建路由映射
  const routeMap = new Map(routes.map(r => [r.name, r]))
  
  return async function execute<T = unknown>(
    name: string, 
    args: unknown
  ): Promise<T> {
    // 1. 查找路由
    const route = routeMap.get(name)
    if (!route) {
      throw new Error(`Unknown tool: ${name}`)
    }
    
    // 2. 参数校验
    let validatedArgs = args
    if (route.params) {
      const result = route.params.safeParse(args)
      if (!result.success) {
        throw new Error(`参数校验失败: ${result.error.message}`)
      }
      validatedArgs = result.data
    }
    
    // 3. 直接调用 handler
    const result = await route.handler(validatedArgs)
    
    return result as T
  }
}
```

### 使用示例

```typescript
// 创建执行器
const execute = createLocalExecutor(routes)

// 直接调用，无网络开销
const tax = await execute('calculateTax', { amount: 1000, rate: 0.13 })
console.log(tax)  // 130

const formatted = await execute('formatDate', { 
  date: '2024-06-15', 
  format: 'YYYY年MM月DD日' 
})
console.log(formatted)  // 2024年06月15日
```

---

## AI 调用工具流程详解

### 整体流程

```
用户: "帮我查一下订单 123 的状态"
           │
           ▼
┌─────────────────────────────┐
│         AI 模型              │
│  1. 理解用户意图             │
│  2. 从 tools 中选择合适的    │
│  3. 生成调用参数             │
└─────────────────────────────┘
           │
           ▼ 返回 tool_calls
┌─────────────────────────────┐
│       你的代码               │
│  1. 解析 tool_calls         │
│  2. 执行对应的 handler       │
│  3. 把结果返回给 AI          │
└─────────────────────────────┘
           │
           ▼ 带上执行结果继续对话
┌─────────────────────────────┐
│         AI 模型              │
│  根据工具结果生成最终回答     │
└─────────────────────────────┘
           │
           ▼
AI: "订单 123 的状态是【已发货】，预计明天送达。"
```

> **重点**：AI 只是「决定调用什么工具、传什么参数」，**实际执行是你的代码做的**。

### AI Tools 格式

#### OpenAI 格式

```typescript
const tools = [
  {
    type: "function",
    function: {
      name: "getOrderStatus",
      description: "查询订单状态",
      parameters: {
        type: "object",
        properties: {
          orderId: { type: "string", description: "订单号" }
        },
        required: ["orderId"]
      }
    }
  }
]
```

#### Claude 格式

```typescript
const tools = [
  {
    name: "getOrderStatus",
    description: "查询订单状态",
    input_schema: {  // 注意：不是 parameters
      type: "object",
      properties: {
        orderId: { type: "string", description: "订单号" }
      },
      required: ["orderId"]
    }
  }
]
```

#### 格式对比

| 字段 | OpenAI | Claude |
|------|--------|--------|
| 参数定义 | `function.parameters` | `input_schema` |
| 外层包装 | `{ type: "function", function: {...} }` | 直接 `{ name, input_schema }` |
| 返回参数 | `arguments` (JSON 字符串) | `input` (对象) |

### 完整调用代码

```typescript
import OpenAI from 'openai'

const openai = new OpenAI()

// 1. 定义工具
const tools = [
  {
    type: "function",
    function: {
      name: "getOrderStatus",
      description: "查询订单状态",
      parameters: {
        type: "object",
        properties: {
          orderId: { type: "string", description: "订单号" }
        },
        required: ["orderId"]
      }
    }
  },
  {
    type: "function", 
    function: {
      name: "createOrder",
      description: "创建新订单",
      parameters: {
        type: "object",
        properties: {
          productId: { type: "string" },
          quantity: { type: "number" }
        },
        required: ["productId", "quantity"]
      }
    }
  }
]

// 2. 定义工具的实际执行函数
const toolHandlers = {
  getOrderStatus: async ({ orderId }) => {
    const order = await db.orders.findById(orderId)
    return { orderId, status: order.status, eta: order.eta }
  },
  
  createOrder: async ({ productId, quantity }) => {
    const order = await db.orders.create({ productId, quantity })
    return { orderId: order.id, total: order.total }
  }
}

// 3. 主函数：处理用户消息
async function chat(userMessage: string) {
  const messages = [
    { role: "user", content: userMessage }
  ]
  
  // 循环直到 AI 不再调用工具
  while (true) {
    // 调用 AI
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: messages,
      tools: tools,
    })
    
    const assistantMessage = response.choices[0].message
    messages.push(assistantMessage)
    
    // 没有工具调用，返回最终回答
    if (!assistantMessage.tool_calls) {
      return assistantMessage.content
    }
    
    // 执行每个工具调用
    for (const toolCall of assistantMessage.tool_calls) {
      const functionName = toolCall.function.name
      const args = JSON.parse(toolCall.function.arguments)
      
      console.log(`执行工具: ${functionName}`, args)
      
      // 执行工具
      const handler = toolHandlers[functionName]
      const result = await handler(args)
      
      console.log(`工具结果:`, result)
      
      // 把工具结果加入消息历史
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(result)
      })
    }
    // 继续循环，让 AI 处理工具结果
  }
}

// 4. 使用
const answer = await chat("帮我查一下订单 ORD-123 的状态")
// "订单 ORD-123 的状态是【已发货】，预计明天送达。"
```

### 消息流程详解

```typescript
// 第一轮：用户提问
messages = [
  { role: "user", content: "帮我查一下订单 ORD-123 的状态" }
]

// AI 返回（选择调用工具，不直接回答）
response.choices[0].message = {
  role: "assistant",
  content: null,  // 没有文字回复
  tool_calls: [
    {
      id: "call_abc123",
      type: "function",
      function: {
        name: "getOrderStatus",
        arguments: '{"orderId": "ORD-123"}'
      }
    }
  ]
}

// 你执行工具后，消息变成
messages = [
  { role: "user", content: "帮我查一下订单 ORD-123 的状态" },
  { role: "assistant", content: null, tool_calls: [...] },
  { 
    role: "tool",                    // 工具结果
    tool_call_id: "call_abc123",     // 对应哪个调用
    content: '{"orderId":"ORD-123","status":"shipped","eta":"2024-01-16"}'
  }
]

// 第二轮：AI 处理工具结果，生成最终回答
response.choices[0].message = {
  role: "assistant",
  content: "订单 ORD-123 的状态是【已发货】，预计 2024-01-16 送达。"
}
```

### 多工具调用

AI 可以一次调用多个工具：

```typescript
// 用户: "帮我查订单 123 的状态，再下一单买 2 个手机壳"

// AI 返回多个工具调用
response.choices[0].message.tool_calls = [
  {
    id: "call_1",
    function: { name: "getOrderStatus", arguments: '{"orderId":"123"}' }
  },
  {
    id: "call_2", 
    function: { name: "createOrder", arguments: '{"productId":"phone-case","quantity":2}' }
  }
]

// 你需要执行两个工具，返回两个结果
for (const call of tool_calls) {
  const result = await toolHandlers[call.function.name](
    JSON.parse(call.function.arguments)
  )
  messages.push({
    role: "tool",
    tool_call_id: call.id,
    content: JSON.stringify(result)
  })
}
```

### 调用流程总结

| 步骤 | 角色 | 动作 |
|------|------|------|
| 1 | 你 | 把 `tools` 定义传给 AI |
| 2 | AI | 返回 `tool_calls`（要调用什么、参数是什么） |
| 3 | 你 | 执行这些工具，获取结果 |
| 4 | 你 | 把结果以 `role: "tool"` 加入消息 |
| 5 | AI | 处理结果，可能继续调用工具或给出最终回答 |
| 6 | - | 重复 2-5 直到 AI 不再调用工具 |

---

## 与 AI Agent 集成

### 基本集成

```typescript
import { routesToTools, createLocalExecutor } from 'vafast/ai'
import OpenAI from 'openai'

// 1. 转换为 AI Tools
const tools = routesToTools(routes)

// 2. 创建本地执行器
const execute = createLocalExecutor(routes)

// 3. AI 对话
const openai = new OpenAI()
const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: '100块钱，税率13%，算一下税费' }],
  tools: tools,
})

// 4. 处理工具调用
if (response.choices[0].message.tool_calls) {
  for (const call of response.choices[0].message.tool_calls) {
    const result = await execute(
      call.function.name,
      JSON.parse(call.function.arguments)
    )
    console.log(`${call.function.name} 返回:`, result)
  }
}
```

### 完整 Agent 循环

```typescript
async function runAgent(userMessage: string) {
  const messages = [{ role: 'user', content: userMessage }]
  
  while (true) {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      tools: routesToTools(routes),
    })
    
    const msg = response.choices[0].message
    messages.push(msg)
    
    // 没有工具调用，返回最终结果
    if (!msg.tool_calls) {
      return msg.content
    }
    
    // 执行所有工具调用
    for (const call of msg.tool_calls) {
      const result = await execute(call.function.name, JSON.parse(call.function.arguments))
      
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(result),
      })
    }
  }
}

// 使用
const answer = await runAgent('帮我算一下 5000 块钱 13% 的税，然后格式化今天的日期')
```

---

## 实际应用场景

### 场景 1：桌面 AI 助手

```typescript
// 纯本地运行，无需服务器
const localTools = [
  {
    name: 'readFile',
    description: '读取本地文件',
    params: z.object({ path: z.string() }),
    handler: ({ path }) => fs.readFileSync(path, 'utf-8'),
  },
  {
    name: 'writeFile',
    description: '写入本地文件',
    params: z.object({ path: z.string(), content: z.string() }),
    handler: ({ path, content }) => fs.writeFileSync(path, content),
  },
  {
    name: 'runCommand',
    description: '执行终端命令',
    params: z.object({ cmd: z.string() }),
    handler: ({ cmd }) => execSync(cmd).toString(),
  },
  {
    name: 'searchFiles',
    description: '搜索文件',
    params: z.object({ pattern: z.string(), cwd: z.string().optional() }),
    handler: ({ pattern, cwd }) => glob.sync(pattern, { cwd }),
  },
  {
    name: 'listDirectory',
    description: '列出目录内容',
    params: z.object({ path: z.string() }),
    handler: ({ path }) => fs.readdirSync(path),
  }
]

// AI 使用这些本地工具
const result = await runAgent('帮我找出项目里所有的 TODO 注释')
// AI 调用 searchFiles + readFile，全程本地执行，无网络请求
```

### 场景 2：Electron 应用

```typescript
// main.ts (主进程)
const systemTools = [
  {
    name: 'showNotification',
    description: '显示系统通知',
    params: z.object({ title: z.string(), body: z.string() }),
    handler: ({ title, body }) => {
      new Notification({ title, body }).show()
      return { success: true }
    }
  },
  {
    name: 'openFile',
    description: '用系统默认程序打开文件',
    params: z.object({ path: z.string() }),
    handler: async ({ path }) => {
      await shell.openPath(path)
      return { success: true }
    }
  },
  {
    name: 'takeScreenshot',
    description: '截取屏幕',
    params: z.object({ savePath: z.string().optional() }),
    handler: async ({ savePath }) => {
      const image = await screenshot.capture()
      if (savePath) fs.writeFileSync(savePath, image)
      return { success: true, path: savePath }
    }
  },
  {
    name: 'getClipboard',
    description: '获取剪贴板内容',
    params: z.object({}),
    handler: () => clipboard.readText()
  }
]

// 暴露给渲染进程
ipcMain.handle('execute-tool', async (event, name, args) => {
  const execute = createLocalExecutor(systemTools)
  return await execute(name, args)
})
```

```typescript
// renderer.ts (渲染进程)
// AI 助手可以调用系统能力
const result = await window.api.executeTool('showNotification', {
  title: '任务完成',
  body: '文件已处理完毕'
})
```

### 场景 3：开发者工具

```typescript
const devTools = [
  {
    name: 'gitStatus',
    description: '查看 Git 状态',
    params: z.object({ cwd: z.string().optional() }),
    handler: ({ cwd }) => execSync('git status', { cwd }).toString()
  },
  {
    name: 'gitCommit',
    description: '提交代码',
    params: z.object({ message: z.string(), cwd: z.string().optional() }),
    handler: ({ message, cwd }) => {
      execSync('git add .', { cwd })
      execSync(`git commit -m "${message}"`, { cwd })
      return { success: true }
    }
  },
  {
    name: 'runTests',
    description: '运行测试',
    params: z.object({ pattern: z.string().optional() }),
    handler: ({ pattern }) => {
      const cmd = pattern ? `npm test ${pattern}` : 'npm test'
      return execSync(cmd).toString()
    }
  },
  {
    name: 'lint',
    description: '代码检查',
    params: z.object({ fix: z.boolean().optional() }),
    handler: ({ fix }) => {
      const cmd = fix ? 'bun lint --fix' : 'bun lint'
      return execSync(cmd).toString()
    }
  }
]

// AI 开发助手
await runAgent('帮我检查代码，修复 lint 问题，然后提交')
// AI 依次调用: lint(fix=true) → gitStatus → gitCommit
```

### 场景 4：数据处理工具

```typescript
const dataTools = [
  {
    name: 'parseCSV',
    description: '解析 CSV 文件',
    params: z.object({ path: z.string() }),
    handler: ({ path }) => {
      const content = fs.readFileSync(path, 'utf-8')
      return Papa.parse(content, { header: true }).data
    }
  },
  {
    name: 'filterData',
    description: '过滤数据',
    params: z.object({ 
      data: z.array(z.record(z.unknown())),
      condition: z.string() // 如 "age > 18"
    }),
    handler: ({ data, condition }) => {
      // 简单实现，实际可用更安全的方式
      return data.filter(row => eval(condition.replace(/(\w+)/g, 'row.$1')))
    }
  },
  {
    name: 'aggregateData',
    description: '聚合统计',
    params: z.object({
      data: z.array(z.record(z.unknown())),
      groupBy: z.string(),
      aggregate: z.enum(['count', 'sum', 'avg']),
      field: z.string().optional()
    }),
    handler: ({ data, groupBy, aggregate, field }) => {
      // 聚合逻辑...
    }
  },
  {
    name: 'exportToExcel',
    description: '导出为 Excel',
    params: z.object({
      data: z.array(z.record(z.unknown())),
      path: z.string()
    }),
    handler: ({ data, path }) => {
      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
      XLSX.writeFile(wb, path)
      return { success: true, path }
    }
  }
]

// 用自然语言处理数据
await runAgent('读取 sales.csv，筛选出销售额大于1000的记录，导出到 result.xlsx')
```

---

## 安全考虑

### 权限控制

```typescript
interface SecureRoute {
  name: string
  handler: Function
  meta: {
    permissions?: string[]      // 需要的权限
    dangerous?: boolean         // 是否危险操作
    requireConfirm?: boolean    // 是否需要确认
    rateLimit?: number          // 调用频率限制
  }
}

function createSecureExecutor(routes: SecureRoute[], user: User) {
  const execute = createLocalExecutor(routes)
  
  return async (name: string, args: unknown) => {
    const route = routes.find(r => r.name === name)
    
    // 权限检查
    if (route.meta.permissions) {
      const hasPermission = route.meta.permissions.every(p => user.permissions.includes(p))
      if (!hasPermission) throw new Error('权限不足')
    }
    
    // 危险操作二次确认
    if (route.meta.requireConfirm) {
      const confirmed = await confirmDialog(`确认执行 ${name}？`)
      if (!confirmed) throw new Error('用户取消')
    }
    
    // 频率限制
    if (route.meta.rateLimit) {
      await checkRateLimit(name, route.meta.rateLimit)
    }
    
    return execute(name, args)
  }
}
```

### 沙箱执行

```typescript
// 对于不信任的代码，在沙箱中执行
import { VM } from 'vm2'

const sandboxedTools = [
  {
    name: 'evaluateExpression',
    description: '计算数学表达式',
    params: z.object({ expression: z.string() }),
    handler: ({ expression }) => {
      const vm = new VM({ timeout: 1000 })
      return vm.run(expression)
    }
  }
]
```

---

## 性能优势

| 方面 | HTTP 调用 | 本地调用 |
|------|-----------|----------|
| 延迟 | 10-100ms+ | <1ms |
| 网络依赖 | 需要网络 | 无需网络 |
| 并发能力 | 受服务器限制 | 仅受 CPU 限制 |
| 错误类型 | 网络+业务错误 | 仅业务错误 |
| 调试 | 需要抓包 | 直接断点 |

---

## 总结

### 核心价值

> **声明式路由 = 与运行时解耦的能力清单**
>
> 可以跑在 HTTP 服务上，也可以纯本地执行。

### 适用场景

| 场景 | 说明 |
|------|------|
| 桌面 AI 助手 | 本地文件操作、系统调用 |
| Electron 应用 | 系统能力暴露给 AI |
| 开发者工具 | Git、测试、Lint 等 |
| 数据处理 | CSV、Excel 处理 |
| CLI 工具 | 命令行自动化 |
| 边缘计算 | 低延迟本地处理 |

### 与 HTTP 模式的关系

```
同一份路由配置
      │
      ├── 开发/测试：本地模式（快速迭代）
      │
      ├── 生产部署：HTTP 模式（分布式）
      │
      └── AI 集成：自动适配（本地或远程）
```

**一句话**：声明式路由让「能力」和「运行方式」解耦，AI Agent 不关心是本地还是远程，只需要知道有哪些能力可用。

