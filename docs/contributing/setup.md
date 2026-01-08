# 开发环境设置

本指南将帮助您设置 Vafast 框架的开发环境，以便进行代码贡献和本地开发。

## 🚀 系统要求

### 必需软件
- **Node.js**: 18.0.0 或更高版本
- **Bun**: 1.0.0 或更高版本 (推荐)
- **Git**: 最新版本
- **编辑器**: VS Code, WebStorm, 或您喜欢的编辑器

### 推荐软件
- **VS Code**: 带有 TypeScript 和 Bun 扩展
- **Docker**: 用于运行测试数据库
- **Postman/Insomnia**: API 测试工具

## 📥 获取代码

### 1. Fork 项目
1. 访问 [Vafast GitHub 仓库](https://github.com/vafast/vafast)
2. 点击 "Fork" 按钮创建您的副本
3. 克隆您的 fork 到本地

```bash
git clone https://github.com/YOUR_USERNAME/vafast.git
cd vafast
```

### 2. 添加上游仓库
```bash
git remote add upstream https://github.com/vafast/vafast.git
git fetch upstream
```

## 🔧 环境配置

### 1. 安装依赖
```bash
# 使用 bun (推荐)
npm install

# 使用 npm
npm install

# 使用 yarn
yarn install
```

### 2. 环境变量配置
创建 `.env.local` 文件：

```bash
# 开发环境
NODE_ENV=development
PORT=3000

# 测试环境
TEST_PORT=3001
TEST_DB_URL=postgresql://localhost/vafast_test

# 调试
DEBUG=vafast:*
LOG_LEVEL=debug
```

### 3. 数据库设置 (可选)
```bash
# 使用 Docker 运行 PostgreSQL
docker run -d \
  --name vafast-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=vafast_dev \
  -p 5432:5432 \
  postgres:15

# 创建测试数据库
docker exec -it vafast-postgres psql -U postgres -c "CREATE DATABASE vafast_test;"
```

## 🧪 运行测试

### 1. 单元测试
```bash
# 运行所有测试
npm test

# 运行特定测试
npm test tests/unit/

# 运行测试并生成覆盖率报告
npm test --coverage
```

### 2. 基准测试
```bash
# 运行所有基准测试
npm run benchmark

# 运行特定基准测试
npm run benchmarks/quick-benchmark.ts
```

### 3. 类型检查
```bash
# TypeScript 类型检查
npm run build

# 或者使用 tsc
npx tsc --noEmit
```

## 🔨 开发工作流

### 1. 创建功能分支
```bash
# 确保主分支是最新的
git checkout main
git pull upstream main

# 创建功能分支
git checkout -b feature/your-feature-name
```

### 2. 开发过程
```bash
# 安装依赖 (如果需要)
npm install

# 启动开发服务器
npm run dev

# 运行测试
npm test

# 检查代码质量
npm run lint
npm run format
```

### 3. 提交代码
```bash
# 添加更改
git add .

# 提交更改
git commit -m "feat: 添加新功能描述"

# 推送到您的 fork
git push origin feature/your-feature-name
```

### 4. 创建 Pull Request
1. 访问您的 GitHub fork
2. 点击 "Compare & pull request"
3. 填写 PR 描述和标签
4. 等待代码审查

## 🛠️ 开发工具

### 1. VS Code 扩展推荐
```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json"
  ]
}
```

### 2. 调试配置
创建 `.vscode/launch.json`：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Tests",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/bun",
      "args": ["test", "${file}"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    },
    {
      "name": "Debug Server",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/src/index.ts",
      "runtimeArgs": ["--inspect-brk"],
      "console": "integratedTerminal"
    }
  ]
}
```

## 📊 代码质量

### 1. 代码风格
```bash
# 格式化代码
npm run format

# 检查代码风格
npm run lint

# 自动修复
npm run lint:fix
```

### 2. 类型检查
```bash
# 严格类型检查
npm run type-check

# 生成类型声明文件
npm run build:types
```

## 🐛 故障排除

### 常见问题

#### 1. 依赖安装失败
```bash
# 清理缓存
bun pm cache rm
npm cache clean --force

# 删除 node_modules 重新安装
rm -rf node_modules
npm install
```

#### 2. 测试失败
```bash
# 检查测试环境
npm test --verbose

# 运行单个测试
npm test tests/unit/specific.test.ts
```

#### 3. 类型错误
```bash
# 检查 TypeScript 配置
npx tsc --showConfig

# 重新生成类型
npm run build:types
```

## 📚 相关资源

- [代码规范](./code-style.md)
- [测试指南](./testing.md)
- [提交规范](./commits.md)
- [API 文档](../api/)

## 🆘 获取帮助

如果您在设置过程中遇到问题：

1. 查看 [FAQ](../faq.md)
2. 搜索 [Issues](https://github.com/vafast/vafast/issues)
3. 创建新的 [Issue](https://github.com/vafast/vafast/issues/new)
4. 加入 [Discussions](https://github.com/vafast/vafast/discussions)

---

**提示**: 确保您的开发环境与项目要求保持一致，这样可以避免很多常见问题。
