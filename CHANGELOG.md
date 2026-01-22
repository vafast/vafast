# 变更日志

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/) 规范。

## [0.5.17] - 2026-01-22

### 改进
- 🔧 **SSEHandler 类型优化** - 使用泛型擦除技术解决类型推断问题
  - `createSSEHandler` 内部保留完整类型检查
  - 返回类型简化为 `SSEHandler<RouteSchema>`，避免复杂类型传播
  - 使用 SSE handler 的 `defineRoutes` 不再需要显式类型注解
  - 新增类型兼容性测试用例
  - 更新 SSE 文档，添加类型说明

## [0.5.16] - 2026-01-22

### 新增
- 🆕 **Route 类型别名** - 添加 `Route` 作为 `ProcessedRoute` 的友好别名

## [0.5.6] - 2026-01-22

### 改进
- 🔧 **createSSEHandler 兼容性增强** - 现在同时支持两种使用方式
  - 方式 1: 低层 API `route('GET', '/stream', createSSEHandler(...))`
  - 方式 2: 高层 API `defineRoute({ handler: createSSEHandler(...) })`
  - 自动检测参数类型（Request vs HandlerContext），无需手动适配
  - 完善测试用例覆盖两种调用方式
  - 新增 SSE 文档 `docs/sse.md`

## [0.5.5] - 2025-01-14

### 新增
- 🆕 **RouteRegistry 路由注册表** - 路由元信息收集与查询工具
  - `createRouteRegistry()` - 创建路由注册表
  - `server.getRoutesWithMeta()` - 获取完整路由元信息
  - Server 创建时自动设置全局 RouteRegistry
  - 支持按 method+path 查询、按分类筛选、自定义字段筛选
  - 适用于 API 文档生成、Webhook 事件注册、权限检查等场景
- 🆕 **全局路由访问函数** - Server 创建后可在任意位置访问路由信息
  - `getRouteRegistry()` - 获取全局 RouteRegistry 实例
  - `getRoute(method, path)` - 快速查询单个路由
  - `getAllRoutes()` - 获取所有路由
  - `filterRoutes(field)` - 筛选有特定字段的路由
  - `getRoutesByMethod(method)` - 按 HTTP 方法获取路由

### 改进
- Server 自动初始化全局 RouteRegistry，无需手动创建
- 优化路由注册表查询性能

## [未发布]

### 新增
- 新增超优化验证器系统
- 新增组件渲染支持 (Vue/React SSR)
- 新增嵌套路由系统
- 新增内置监控系统

### 改进
- 优化路由匹配算法
- 改进中间件组合系统
- 增强错误处理机制
- 提升类型安全性

### 修复
- 修复路由冲突检测问题
- 修复中间件执行顺序问题
- 修复内存泄漏问题

## [0.2.3] - 2025-12-31

### 修复
- 修复 CI 发布流程：使用 OIDC Trusted Publishing 发布到 npm，避免 token 过期/撤销导致发布失败

## [0.1.17] - 2024-12-19

### 新增
- 🚀 超高性能的Node.js Web框架
- 🔒 完整的TypeScript类型支持
- 🧩 灵活的中间件系统
- ✅ 内置Schema验证器
- 🎯 零依赖架构设计

### 特性
- 智能路由排序和冲突检测
- 扁平化嵌套路由支持
- 超优化验证器 (Ultra版本)
- 内置CORS、认证、速率限制中间件
- 支持动态路由和通配符
- 自动OPTIONS请求处理

### 性能
- 路由匹配性能优化
- 验证器内存池优化
- 中间件链优化
- 支持Bun运行时

## [0.1.0] - 2024-12-01

### 新增
- 初始版本发布
- 基础路由系统
- 简单中间件支持
- TypeScript支持

---

## 版本说明

- **主版本号**: 不兼容的API修改
- **次版本号**: 向下兼容的功能性新增
- **修订号**: 向下兼容的问题修正

## 贡献指南

如果您想为变更日志做出贡献，请：
1. 遵循现有的格式和风格
2. 在PR描述中说明变更内容
3. 确保变更描述清晰易懂
4. 使用emoji增加可读性

## 链接

- [完整发布历史](https://github.com/vafast/vafast/releases)
- [贡献指南](./docs/contributing/)
- [API文档](./docs/api/)
