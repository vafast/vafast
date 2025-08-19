# 服务器架构优化说明

## 优化概述

本次优化主要针对 `src/server.ts` 和 `src/server/component-server.ts` 两个文件进行了重构，通过提取公共逻辑、创建工具类和基类，显著减少了代码重复，提高了可维护性和可扩展性。

## 主要优化点

### 1. 创建基类 `BaseServer`

- **位置**: `src/server/base-server.ts`
- **功能**: 包含所有服务器类型的公共逻辑
  - 中间件管理 (`use` 方法)
  - 路由冲突检测
  - 路径匹配和参数提取
  - OPTIONS 请求处理
  - 日志记录

### 2. 提取工具类

#### `PathMatcher` - 路径匹配工具
- **位置**: `src/utils/path-matcher.ts`
- **功能**: 统一的路径匹配、参数提取、冲突检测
- **方法**:
  - `matchPath()` - 路径匹配
  - `extractParams()` - 参数提取
  - `calculatePathScore()` - 路径特异性评分
  - `pathsMayConflict()` - 路径冲突检测

#### `HtmlRenderer` - HTML渲染工具
- **位置**: `src/utils/html-renderer.ts`
- **功能**: 统一的HTML模板生成
- **方法**:
  - `generateBaseHtml()` - 基础HTML模板
  - `generateVueHtml()` - Vue组件HTML
  - `generateReactHtml()` - React组件HTML

#### `DependencyManager` - 依赖管理器
- **位置**: `src/utils/dependency-manager.ts`
- **功能**: 按需加载和管理框架依赖
- **方法**:
  - `getFrameworkDeps()` - 获取框架依赖
  - `detectComponentType()` - 检测组件类型
  - `clearCache()` - 清除缓存
  - `getCacheStatus()` - 获取缓存状态

### 3. 重构现有服务器类

#### `Server` 类优化
- 继承 `BaseServer` 基类
- 使用 `PathMatcher` 工具类
- 移除重复的路径处理逻辑
- 代码行数从 249 行减少到约 80 行

#### `ComponentServer` 类优化
- 继承 `BaseServer` 基类
- 使用所有工具类
- 移除重复的路径处理和HTML生成逻辑
- 代码行数从 311 行减少到约 150 行

### 4. 创建服务器工厂

#### `ServerFactory` 类
- **位置**: `src/server/server-factory.ts`
- **功能**: 统一创建和管理不同类型的服务器
- **方法**:
  - `createRestServer()` - 创建REST API服务器
  - `createComponentServer()` - 创建组件服务器
  - `getServer()` - 获取指定类型服务器
  - `getServerStatus()` - 获取服务器状态

## 优化效果

### 代码减少
- **总代码行数**: 从 560 行减少到约 400 行
- **重复代码**: 消除了约 160 行重复代码
- **维护性**: 显著提高，公共逻辑集中管理

### 功能增强
- **统一接口**: 所有服务器类都有相同的中间件管理接口
- **更好的错误处理**: 统一的路径冲突检测
- **可扩展性**: 新增服务器类型更容易
- **测试友好**: 工具类可以独立测试

### 性能优化
- **依赖缓存**: 框架依赖按需加载并缓存
- **路径匹配**: 统一的路径匹配算法
- **内存管理**: 更好的资源管理

## 使用示例

### 创建服务器
```typescript
import { ServerFactory } from './server';

const factory = new ServerFactory();

// 创建REST API服务器
const restServer = factory.createRestServer(routes);

// 创建组件服务器
const componentServer = factory.createComponentServer(componentRoutes);

// 获取服务器状态
console.log(factory.getServerStatus());
```

### 使用工具类
```typescript
import { PathMatcher, HtmlRenderer, DependencyManager } from './server';

// 路径匹配
const isMatch = PathMatcher.matchPath('/user/:id', '/user/123');

// 生成HTML
const html = HtmlRenderer.generateVueHtml(content, context);

// 管理依赖
const deps = await dependencyManager.getFrameworkDeps('vue');
```

## 向后兼容性

- 所有现有的API接口保持不变
- 现有的中间件和路由配置无需修改
- 性能表现与优化前保持一致或更好

## 未来扩展

- 支持更多框架（如Svelte、Angular）
- 添加更多中间件类型
- 支持WebSocket和实时通信
- 添加性能监控和指标收集
