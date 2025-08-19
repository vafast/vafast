# Vafast 使用示例

这个文件夹包含了 Vafast 框架的各种使用示例，按功能分类组织。

## 示例分类

### 📁 basic/ - 基础示例
- `hello-world.ts` - 最简单的 Hello World 示例
- `rest-api.ts` - 完整的 REST API 示例

### 📁 advanced/ - 高级示例  
- `file-upload.ts` - 文件上传示例
- `streaming.ts` - 流式响应示例

### 📁 middleware/ - 中间件示例
- `basic-middleware.ts` - 基础中间件示例
- `cors.ts` - CORS 中间件示例
- `error-handling.ts` - 错误处理示例
- `vafast-rate-limit.ts` - 速率限制示例
- `vafast-style.ts` - 综合中间件示例

## 运行示例

```bash
# 运行基础示例
bun run example

# 运行特定示例
bun run example/basic/hello-world.ts
bun run example/middleware/cors.ts
bun run example/advanced/file-upload.ts
```

## 关键特性

Vafast 使用现代的 Web API 设计：
- 基于 `Server` 类和 `Route` 数组
- 使用标准的 `Request`/`Response` API
- 支持 Bun 的默认导出格式
- 内置中间件支持
- 结构化错误处理

## 更多示例

欢迎贡献更多示例代码！
