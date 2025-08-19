# Vafast 测试套件

本目录包含了 Vafast 框架的完整测试套件，确保框架的稳定性和可靠性。

## 🧪 测试结构

```
tests/
├── unit/           # 单元测试 - 测试独立的函数和组件
├── integration/    # 集成测试 - 测试组件间的交互
├── e2e/           # 端到端测试 - 测试完整的应用流程
├── fixtures/       # 测试数据 - 测试用数据和配置
└── utils/          # 测试工具 - 测试辅助函数
```

## 🚀 运行测试

### 运行所有测试
```bash
# 使用 bun (推荐)
bun test

# 使用 npm
npm test

# 使用 yarn
yarn test
```

### 运行特定测试
```bash
# 运行单元测试
bun test tests/unit/

# 运行集成测试
bun test tests/integration/

# 运行特定测试文件
bun test tests/unit/server.test.ts
```

### 测试覆盖率
```bash
# 生成覆盖率报告
bun test --coverage

# 查看覆盖率报告
open coverage/lcov-report/index.html
```

## 📋 测试分类

### 🔬 单元测试 (`unit/`)
测试独立的函数和组件：
- `server.test.ts` - 服务器核心功能
- `router.test.ts` - 路由系统
- `middleware.test.ts` - 中间件系统
- `validators.test.ts` - 验证器系统
- `utils.test.ts` - 工具函数
- `basic.test.ts` - 基础功能
- `advanced.test.ts` - 高级功能
- `nested-routes.test.ts` - 嵌套路由
- `schema-validator.test.ts` - Schema验证器
- `vafast.test.ts` - 框架核心功能

### 🔗 集成测试 (`integration/`)
测试组件间的交互：
- `test-custom-validation-errors.ts` - 自定义验证错误
- `test-dynamic-routes.ts` - 动态路由集成
- `test-enhanced-body-parsing.ts` - 增强的请求体解析
- `test-enhanced-features.ts` - 增强功能集成
- `test-route-conflicts.ts` - 路由冲突检测

## 🛠️ 测试工具

### 测试框架
- **Bun Test**: 内置测试运行器，性能优异
- **断言库**: 内置断言函数，支持快照测试

### 测试工具函数
```typescript
import { createTestServer, createTestRequest } from './utils/test-helpers';

// 创建测试服务器
const server = createTestServer(routes);

// 创建测试请求
const request = createTestRequest('/api/users', 'POST', { name: 'test' });

// 运行测试
const response = await server.fetch(request);
```

## 📊 测试数据

### 测试夹具 (`fixtures/`)
- `sample-data.json` - 示例数据
- `schemas.ts` - 测试用Schema
- `middleware.ts` - 测试用中间件

### 测试环境
- **开发环境**: 使用内存数据库和模拟服务
- **CI环境**: 使用真实的测试数据库
- **本地环境**: 可配置使用真实或模拟服务

## 🔧 测试配置

### 环境变量
```bash
# 测试环境
NODE_ENV=test

# 测试数据库
TEST_DB_URL=postgresql://localhost/vafast_test

# 测试端口
TEST_PORT=3001
```

### 测试超时
```typescript
// 设置测试超时时间
describe('慢速操作测试', () => {
  it('应该在5秒内完成', async () => {
    // 测试代码
  }, 5000);
});
```

## 📈 测试报告

### 测试结果
- 测试通过率
- 测试执行时间
- 失败测试详情
- 性能指标

### 持续集成
- GitHub Actions 自动测试
- 代码覆盖率报告
- 性能回归检测

## 🐛 调试测试

### 调试模式
```bash
# 启用调试日志
DEBUG=vafast:test bun test

# 运行单个测试并暂停
bun test --inspect-brk tests/unit/server.test.ts
```

### 常见问题
1. **测试超时**: 检查异步操作是否正确等待
2. **内存泄漏**: 使用 `--detect-leaks` 标志
3. **环境问题**: 确保测试环境配置正确

## 🤝 贡献测试

### 添加新测试
1. 在合适的目录创建测试文件
2. 遵循命名规范：`*.test.ts`
3. 添加完整的测试用例
4. 确保测试覆盖率

### 测试规范
- 每个功能至少有一个测试用例
- 测试名称清晰描述测试内容
- 使用 `describe` 和 `it` 组织测试
- 测试应该是独立的，不依赖其他测试

## 📚 相关资源

- [测试最佳实践](../docs/advanced/testing.md)
- [性能测试指南](../docs/advanced/performance.md)
- [贡献指南](../docs/contributing/testing.md)

---

**提示**: 在修改代码后，请确保运行相关测试，保持测试套件的完整性。
