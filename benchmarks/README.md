# Vafast 性能测试

这个文件夹包含了 Vafast 框架的性能测试和基准测试。

## 运行性能测试

```bash
# 运行所有性能测试
bun run benchmarks/performance.ts

# 或者直接运行
bun benchmarks/performance.ts
```

## 测试文件

- `performance.ts` - 路由对象创建和 Server 实例创建性能测试

## 测试内容

### 路由对象创建性能
- 测试创建大量路由对象的性能
- 默认测试 10,000 个路由对象的创建时间

### Server 实例创建性能
- 测试创建大量 Server 实例的性能
- 默认测试 1,000 个 Server 实例的创建时间

## 自定义测试

你可以修改 `performance.ts` 文件中的 `iterations` 变量来调整测试规模：

```typescript
const iterations = 10000; // 调整这个值
```

## 性能测试说明

这些测试主要关注：
- 路由对象的内存分配和创建性能
- Server 实例的实例化性能
- 大量对象创建时的系统响应性

## 结果解读

测试结果会显示：
- 操作完成时间
- 处理的条目数量
- 性能指标

这些数据可以帮助你了解框架在不同负载下的表现。
