# 基础示例

这个文件夹包含了 Vafast 框架的基础使用示例。

## 示例文件

### hello-world.ts
最简单的 Hello World 示例，展示如何创建一个基本的 GET 路由。

**运行方式：**
```bash
npm run example/basic/hello-world.ts
```

**功能：**
- 访问 `/` 路径返回 "来自 Vafast 的 Hello World！"

### rest-api.ts
完整的 REST API 示例，展示如何处理不同的 HTTP 方法和路径参数。

**运行方式：**
```bash
npm run example/basic/rest-api.ts
```

**功能：**
- `GET /users` - 获取所有用户列表
- `GET /users/:id` - 根据 ID 获取特定用户
- `POST /users` - 创建新用户

## 测试 API

启动后可以使用以下命令测试：

```bash
# 获取所有用户
curl http://localhost:3000/users

# 获取特定用户
curl http://localhost:3000/users/1

# 创建新用户
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Charlie","email":"charlie@example.com"}'
```

## 学习要点

- 基本的路由定义
- 路径参数处理
- 请求体解析
- 响应状态码设置
- 内容类型头设置
