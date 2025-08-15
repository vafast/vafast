# 高级示例

这个文件夹包含了 Vafast 框架的高级功能示例。

## 示例文件

### file-upload.ts
文件上传示例，展示如何处理 multipart/form-data 请求和文件上传。

**运行方式：**
```bash
bun run example/advanced/file-upload.ts
```

**功能：**
- `GET /upload` - 显示文件上传表单
- `POST /upload` - 处理文件上传请求

### streaming.ts
流式响应示例，展示如何实现 Server-Sent Events 和分块传输。

**运行方式：**
```bash
bun run example/advanced/streaming.ts
```

**功能：**
- `GET /stream` - Server-Sent Events 流
- `GET /chunked` - 分块传输响应

## 测试示例

启动后可以在浏览器中访问：
- http://localhost:3000/upload - 文件上传页面
- http://localhost:3000/stream - 实时数据流
- http://localhost:3000/chunked - 分块响应

## 学习要点

- 文件上传处理
- 流式响应实现
- Server-Sent Events
- 分块传输编码
- 异步数据处理
