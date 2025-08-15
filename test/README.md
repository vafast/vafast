# Vafast 测试

这个文件夹包含了 Vafast 框架的测试文件。

## 运行测试

```bash
# 运行所有测试
bun test

# 运行特定测试文件
bun test test/vafast.test.ts
```

## 测试文件

- `vafast.test.ts` - 基本的框架功能测试，包括 Server 实例创建、路由处理和 404 响应

## 测试框架

我们使用 Bun 的内置测试框架，它提供了：
- `describe` - 测试套件分组
- `it` - 测试用例
- `expect` - 断言
- `beforeEach` - 测试前置条件

## 测试内容

- Server 实例创建测试
- GET 和 POST 请求处理测试
- 404 错误响应测试
- 路由匹配功能测试

## 添加新测试

1. 创建新的 `.test.ts` 文件
2. 导入需要测试的模块
3. 编写测试用例
4. 运行测试确保通过
