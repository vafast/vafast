# 中间件示例

这个文件夹包含了 Vafast 框架的中间件使用示例。

## 示例文件

### basic-middleware.ts
基础中间件示例，展示如何创建和使用自定义中间件。

### vafast-rate-limit.ts
速率限制中间件示例，展示如何实现请求频率控制。

### cors.ts
CORS 中间件示例，展示如何处理跨域请求。

### error-handling.ts
错误处理中间件示例，展示如何使用 VafastError。

### vafast-style.ts
综合中间件示例，展示多种中间件的组合使用。

## 中间件概念

在 Vafast 中，中间件是函数，可以：
- 在请求到达处理器之前执行
- 修改请求或响应
- 提前返回响应（如认证失败）
- 传递给下一个中间件或处理器

## 运行示例

```bash
# 运行基础中间件示例
bun run example/middleware/basic-middleware.ts

# 运行速率限制示例
bun run example/middleware/vafast-rate-limit.ts

# 运行 CORS 示例
bun run example/middleware/cors.ts

# 运行错误处理示例
bun run example/middleware/error-handling.ts
```

## 学习要点

- 中间件的执行顺序
- 如何创建自定义中间件
- 中间件的错误处理
- 中间件的组合使用
