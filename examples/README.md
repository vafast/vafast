# Vafast 使用示例

这个文件夹包含了 Vafast 框架的各种使用示例，按功能分类组织。

## 示例分类

### 📁 basic/ - 基础示例
- `hello-world.ts` - 最简单的 Hello World 示例
- `rest-api.ts` - 完整的 REST API 示例

### 📁 advanced/ - 高级示例  
- `file-upload.ts` - 文件上传示例
- `streaming.ts` - 流式响应示例
- `component-routes.ts` - 组件路由示例
- `component-server.ts` - 组件服务器示例
- `middleware-order.ts` - 中间件顺序示例
- `nested-routes.ts` - 嵌套路由示例
- `schema-validation.ts` - Schema验证示例
- `schema.ts` - 完整Schema示例
- `simple-test.ts` - 简单测试示例
- `ssr-vs-spa-test.ts` - SSR vs SPA 对比示例
- `vue-ssr/` - Vue服务端渲染示例
- `components/` - 各种组件示例
- `native-monitoring.ts` - 原生监控示例
- `custom-validation-errors.ts` - 自定义验证错误示例
- `request-validator-example.ts` - 请求验证器示例
- `schema-validation-example.ts` - Schema验证示例

### 📁 middleware/ - 中间件示例
- `basic-middleware.ts` - 基础中间件示例
- `cors.ts` - CORS 中间件示例
- `error-handling.ts` - 错误处理示例
- `vafast-rate-limit.ts` - 速率限制示例
- `vafast-style.ts` - 综合中间件示例

## 运行示例

```bash
# 运行基础示例
bun run examples/basic/hello-world.ts

# 运行中间件示例
bun run examples/middleware/cors.ts

# 运行高级示例
bun run examples/advanced/file-upload.ts
```

## 关键特性

Vafast 使用现代的 Web API 设计：
- 基于 `Server` 类和 `Route` 数组
- 使用标准的 `Request`/`Response` API
- 支持 Bun 的默认导出格式
- 内置中间件支持
- 结构化错误处理

## 示例说明

### 基础示例
适合初学者，展示框架的基本用法：
- 创建服务器
- 定义路由
- 处理请求和响应

### 中间件示例
展示中间件的各种用法：
- 日志记录
- 错误处理
- CORS 配置
- 速率限制

### 高级示例
适合有经验的开发者：
- Schema 验证
- 组件渲染
- 文件上传
- 流式响应
- 监控系统

## 更多示例

欢迎贡献更多示例代码！每个示例都应该：
1. 有清晰的注释说明
2. 包含运行说明
3. 展示最佳实践
4. 易于理解和修改
