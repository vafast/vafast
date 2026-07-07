# 贡献指南

感谢你对 Vafast 的贡献！

## 开发环境

### 前置要求

- [Bun](https://bun.sh/) >= 1.0.0
- [Node.js](https://nodejs.org/) >= 18.0.0 (可选，用于兼容性测试)

### 安装

```bash
git clone https://github.com/vafast/vafast.git
cd vafast
npm install
```

### 常用命令

```bash
npm run dev          # 开发模式
npm run build        # 构建
npm run test         # 运行测试
npm run test:watch   # 监听模式测试
npm run lint         # 代码检查
npm run format       # 格式化代码
npm run type-check   # 类型检查
```

## 分支策略

- `main` - 主分支，受保护，需要通过 PR 合并
- `feature/*` - 新功能分支
- `fix/*` - Bug 修复分支
- `docs/*` - 文档更新分支

## 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Type

- `feat` - 新功能
- `fix` - Bug 修复
- `docs` - 文档更新
- `style` - 代码格式（不影响功能）
- `refactor` - 重构
- `perf` - 性能优化
- `test` - 测试相关
- `chore` - 构建/工具相关

### 示例

```bash
feat(router): add wildcard route support
fix(server): handle empty body correctly
docs: update README with new API
```

## Pull Request 流程

1. Fork 仓库
2. 创建分支：`git checkout -b feature/xxx`
3. 开发并提交
4. 确保通过所有检查：
   ```bash
   npm run lint
   npm run test
   npm run build
   ```
5. 推送分支：`git push origin feature/xxx`
6. 创建 Pull Request
7. 等待 CI 通过和 Review
8. 合并

## 发布流程

> ⚠️ 仅限维护者

### 自动发布（推荐）

1. **更新版本号**
   ```bash
   npm version patch  # 0.1.14 → 0.1.15 (bug fixes)
   npm version minor  # 0.1.14 → 0.2.0  (new features)
   npm version major  # 0.1.14 → 1.0.0  (breaking changes)
   ```

2. **推送 tag**
   ```bash
   git push && git push --tags
   ```

3. **创建 GitHub Release**
   ```bash
   gh release create v0.x.x --title "v0.x.x" --notes "Release notes..."
   ```
   
   或在 GitHub 网页：
   - 进入 [Releases](https://github.com/vafast/vafast/releases)
   - 点击 "Draft a new release"
   - 选择 tag，填写标题和说明
   - 点击 "Publish release"

4. **自动发布**
   - GitHub Actions 自动触发 `publish.yml`
   - 构建 → 测试 → 发布到 npm
   - 使用 OIDC Trusted Publishing，无需 token

### 查看发布状态

- [GitHub Actions](https://github.com/vafast/vafast/actions) - 查看 CI/CD 状态
- [npm vafast](https://www.npmjs.com/package/vafast) - 查看已发布版本

### Release Notes 模板

```markdown
## What's Changed

### 🚀 新功能
- 功能描述

### 🔧 优化
- 优化描述

### 🐛 修复
- 修复描述

### ⚠️ Breaking Changes
- 破坏性变更说明

### 📦 Dependencies
- 依赖更新
```

## 代码规范

### TypeScript

- 使用 TypeScript strict 模式
- 避免使用 `any`，除非必要
- 使用函数式编程风格
- 未使用的变量使用 `_` 前缀

### 测试

- 单元测试放在 `tests/unit/`
- 集成测试放在 `tests/integration/`
- 测试文件命名：`*.test.ts`

### 文档

- 公共 API 必须有 JSDoc 注释
- 复杂逻辑添加行内注释
- README 保持最新

### 错误响应契约（v0.8.4+）

- **成功**：裸 JSON
- **Schema 校验失败**：HTTP 422，`{ code: 422, message, details[] }`，`details[].message` 为 TypeBox 原文
- **业务错误**：`throw err.*()` → `{ code: number, message: string }`，`code` 始终为 number

相关测试：`tests/unit/schema-validation-response.test.ts`、`tests/unit/validation-errors.test.ts`

## 问题反馈

- [Bug Report](https://github.com/vafast/vafast/issues/new?template=bug-report.yml)
- [Feature Request](https://github.com/vafast/vafast/issues/new?template=feature-request.yml)
- [Discussions](https://github.com/vafast/vafast/discussions)

## License

MIT

