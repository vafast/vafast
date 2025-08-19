# Vafast 项目结构

本文档描述了 Vafast 框架的完整项目结构，帮助开发者快速了解项目组织方式。

## 📁 目录结构

```
vafast/
├── 📚 docs/                    # 项目文档
│   ├── 📖 README.md           # 文档主页
│   ├── 🚀 getting-started/    # 快速开始指南
│   ├── 🎯 core/              # 核心功能文档
│   ├── 🔧 advanced/          # 高级功能文档
│   ├── 📖 api/               # API 参考文档
│   ├── 🧪 examples/          # 示例和教程
│   └── 🤝 contributing/      # 贡献指南
├── 🧪 tests/                  # 测试套件
│   ├── 📖 README.md          # 测试说明
│   ├── 🔬 unit/              # 单元测试
│   ├── 🔗 integration/       # 集成测试
│   ├── 🌐 e2e/               # 端到端测试
│   ├── ⚡ performance/       # 性能测试
│   ├── 📊 fixtures/          # 测试数据
│   └── 🛠️ utils/             # 测试工具
├── 🧪 examples/               # 示例代码
│   ├── 📖 README.md          # 示例说明
│   ├── 🚀 basic/             # 基础示例
│   ├── 🔧 middleware/        # 中间件示例
│   ├── 🎯 advanced/          # 高级示例
│   └── 🧪 testing/           # 测试示例
├── ⚡ benchmarks/             # 性能基准测试
│   ├── 📖 README.md          # 基准测试说明
│   ├── quick-benchmark.ts    # 快速基准测试
│   ├── validators-benchmark.ts # 验证器基准测试
│   ├── ultra-performance-test.ts # 超性能测试
│   ├── ultimate-performance-test.ts # 终极性能测试
│   └── comprehensive-benchmark.ts # 综合基准测试
├── 🏗️ src/                    # 源代码
│   ├── 📖 index.ts           # 主入口文件
│   ├── 🖥️ server.ts          # 服务器核心
│   ├── 🛣️ router.ts          # 路由系统
│   ├── 🧩 middleware.ts      # 中间件系统
│   ├── 🔒 auth/              # 认证模块
│   ├── 📊 monitoring/        # 监控系统
│   ├── 🛠️ utils/             # 工具函数
│   └── 📝 types/             # 类型定义
├── 🚀 scripts/                # 构建和部署脚本
├── 📦 dist/                   # 构建输出目录
├── 📄 package.json            # 项目配置
├── 📄 tsconfig.json           # TypeScript 配置
├── 📄 README.md               # 项目主页
├── 📄 CHANGELOG.md            # 变更日志
├── 📄 LICENSE                 # 许可证
├── 📄 .gitignore              # Git 忽略文件
├── 📄 .editorconfig           # 编辑器配置
└── 📄 .github/                # GitHub 配置
    └── workflows/             # GitHub Actions
```

## 🔍 详细说明

### 📚 文档目录 (`docs/`)

#### 🚀 快速开始 (`getting-started/`)
- `installation.md` - 安装指南
- `quickstart.md` - 快速开始教程
- `concepts.md` - 基础概念介绍

#### 🎯 核心功能 (`core/`)
- `routing.md` - 路由系统详解
- `middleware.md` - 中间件系统详解
- `validators.md` - 验证器系统详解
- `error-handling.md` - 错误处理详解

#### 🔧 高级功能 (`advanced/`)
- `performance.md` - 性能优化指南
- `type-safety.md` - 类型安全指南
- `testing.md` - 测试策略指南
- `deployment.md` - 部署指南

#### 📖 API 参考 (`api/`)
- `server.md` - Server API 文档
- `route.md` - Route API 文档
- `middleware.md` - Middleware API 文档
- `validators.md` - Validators API 文档

#### 🧪 示例和教程 (`examples/`)
- `basic.md` - 基础示例
- `advanced.md` - 高级示例
- `best-practices.md` - 最佳实践

#### 🤝 贡献指南 (`contributing/`)
- `setup.md` - 开发环境设置
- `code-style.md` - 代码规范
- `testing.md` - 测试指南
- `commits.md` - 提交规范

### 🧪 测试目录 (`tests/`)

#### 🔬 单元测试 (`unit/`)
- `server.test.ts` - 服务器核心测试
- `router.test.ts` - 路由系统测试
- `middleware.test.ts` - 中间件系统测试
- `validators.test.ts` - 验证器系统测试
- `utils.test.ts` - 工具函数测试

#### 🔗 集成测试 (`integration/`)
- `api.test.ts` - API 集成测试
- `middleware-chain.test.ts` - 中间件链测试
- `error-handling.test.ts` - 错误处理测试

#### 🌐 端到端测试 (`e2e/`)
- `full-app.test.ts` - 完整应用测试
- `performance-scenarios.test.ts` - 性能场景测试

#### ⚡ 性能测试 (`performance/`)
- `benchmark.test.ts` - 性能基准测试
- `stress.test.ts` - 压力测试
- `memory.test.ts` - 内存使用测试

#### 📊 测试数据 (`fixtures/`)
- `sample-data.json` - 示例数据
- `schemas.ts` - 测试用 Schema
- `middleware.ts` - 测试用中间件

#### 🛠️ 测试工具 (`utils/`)
- `test-helpers.ts` - 测试辅助函数
- `test-server.ts` - 测试服务器
- `test-request.ts` - 测试请求

### 🧪 示例目录 (`examples/`)

#### 🚀 基础示例 (`basic/`)
- `hello-world.ts` - Hello World 示例
- `rest-api.ts` - REST API 示例
- `static-files.ts` - 静态文件服务示例

#### 🔧 中间件示例 (`middleware/`)
- `basic.ts` - 基础中间件示例
- `cors.ts` - CORS 处理示例
- `error-handling.ts` - 错误处理示例
- `rate-limit.ts` - 速率限制示例
- `auth.ts` - 认证授权示例

#### 🎯 高级示例 (`advanced/`)
- `schema-validation.ts` - Schema 验证示例
- `component-rendering.ts` - 组件渲染示例
- `nested-routes.ts` - 嵌套路由示例
- `file-upload.ts` - 文件上传示例
- `streaming.ts` - 流式响应示例
- `monitoring.ts` - 监控系统示例

#### 🧪 测试示例 (`testing/`)
- `unit-tests.ts` - 单元测试示例
- `integration-tests.ts` - 集成测试示例
- `performance-tests.ts` - 性能测试示例

### ⚡ 基准测试目录 (`benchmarks/`)

#### 性能测试文件
- `quick-benchmark.ts` - 快速性能测试
- `validators-benchmark.ts` - 验证器性能测试
- `ultra-performance-test.ts` - 超性能测试
- `ultimate-performance-test.ts` - 终极性能测试
- `comprehensive-benchmark.ts` - 综合性能测试

### 🏗️ 源代码目录 (`src/`)

#### 核心文件
- `index.ts` - 主入口文件，导出所有公共 API
- `server.ts` - 服务器核心实现
- `router.ts` - 路由匹配和处理
- `middleware.ts` - 中间件组合和执行

#### 功能模块
- `auth/` - 认证和授权模块
- `monitoring/` - 性能监控模块
- `utils/` - 工具函数集合
- `types/` - TypeScript 类型定义

#### 中间件
- `middleware/auth.ts` - 认证中间件
- `middleware/cors.ts` - CORS 中间件
- `middleware/rateLimit.ts` - 速率限制中间件
- `middleware/component-renderer.ts` - 组件渲染中间件

#### 工具函数
- `utils/validators/` - 验证器实现
- `utils/base64url.ts` - Base64URL 编码
- `utils/go-await.ts` - Go 风格的异步处理
- `utils/request-validator.ts` - 请求验证器

## 🎯 设计原则

### 1. 模块化设计
- 每个功能模块独立，职责明确
- 模块间通过清晰的接口通信
- 支持按需导入，减少包体积

### 2. 类型安全
- 完整的 TypeScript 支持
- 严格的类型检查
- 丰富的类型定义

### 3. 性能优先
- 优化的算法实现
- 内存池和缓存优化
- 支持 Bun 运行时

### 4. 开发体验
- 清晰的 API 设计
- 丰富的示例代码
- 完整的文档说明

## 🔧 开发工作流

### 1. 代码组织
- 遵循单一职责原则
- 保持函数和类的简洁性
- 使用描述性的命名

### 2. 测试策略
- 单元测试覆盖核心逻辑
- 集成测试验证模块交互
- 性能测试确保性能指标

### 3. 文档维护
- 代码变更同步更新文档
- 示例代码保持最新
- API 文档及时更新

## 📚 相关资源

- [贡献指南](./docs/contributing/)
- [测试指南](./docs/advanced/testing.md)
- [性能优化](./docs/advanced/performance.md)
- [API 文档](./docs/api/)

---

**提示**: 这个项目结构遵循现代开源项目的最佳实践，确保代码的可维护性和可扩展性。
