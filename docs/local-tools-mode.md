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
      const cmd = pattern ? `bun test ${pattern}` : 'bun test'
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

