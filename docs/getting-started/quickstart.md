# 快速开始

欢迎使用 Vafast！这是一个超高性能的Node.js Web框架。本指南将帮助您在几分钟内搭建第一个Vafast应用。

## 🚀 安装

```bash
# 使用 npm
npm install vafast

# 使用 yarn
yarn add vafast

# 使用 bun (推荐)
npm install vafast
```

## 📝 第一个应用

创建一个新文件 `app.ts`：

```typescript
import { Server, defineRoute, defineRoutes, serve, Type } from 'vafast';

// 定义用户Schema
const userSchema = Type.Object({
  name: Type.String({ minLength: 1 }),
  email: Type.String({ pattern: '^[^@]+@[^@]+\\.[^@]+$' }),
  age: Type.Optional(Type.Number({ minimum: 0 }))
});

// 创建路由
const routes = defineRoutes([
  defineRoute({
    method: 'POST',
    path: '/users',
    schema: { body: userSchema },
    handler: ({ body }) => {
      return { 
        success: true, 
        user: body,
        timestamp: new Date().toISOString()
      };
    }
  })
]);

// 创建服务器
const server = new Server(routes);

// 启动服务器（Node.js）
serve({ fetch: server.fetch, port: 3000 }, () => {
  console.log('🚀 服务器运行在 http://localhost:3000');
});

// 或者使用 Bun（推荐）
// export default { port: 3000, fetch: server.fetch };
```

## 🧪 测试应用

启动应用：

```bash
# 使用 bun (推荐)
npm run app.ts

# 使用 ts-node
npx ts-node app.ts

# 使用 node (需要先编译)
npm run build && node dist/app.js
```

测试API：

```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name": "张三", "email": "zhangsan@example.com", "age": 25}'
```

## 🔧 添加中间件

```typescript
import { Server, defineRoute, defineRoutes, defineMiddleware } from 'vafast';

// 日志中间件
const logger = defineMiddleware(async (req, next) => {
  const start = Date.now();
  console.log(`📥 ${req.method} ${req.url}`);
  
  const response = await next();
  
  const duration = Date.now() - start;
  console.log(`📤 ${req.method} ${req.url} → ${response.status} (${duration}ms)`);
  
  return response;
});

// 认证中间件
const auth = defineMiddleware(async (req, next) => {
  const token = req.headers.get('authorization');
  
  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  return next();
});

const routes = defineRoutes([
  defineRoute({
    method: 'GET',
    path: '/protected',
    middleware: [logger, auth],
    handler: () => ({ message: '认证成功！' })
  })
]);

const server = new Server(routes);
```

## 📚 下一步

- 查看 [路由系统](../core/routing.md) 了解更复杂的路由配置
- 学习 [中间件系统](../core/middleware.md) 构建可扩展的应用
- 探索 [验证器系统](../core/validators.md) 确保数据安全
- 参考 [完整示例](../examples/basic.md) 了解更多用法

## 🆘 遇到问题？

- 查看 [FAQ](../faq.md)
- 搜索 [Issues](https://github.com/vafast/vafast/issues)
- 创建新的 [Issue](https://github.com/vafast/vafast/issues/new)

祝您使用愉快！ 🎉
