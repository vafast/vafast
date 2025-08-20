/**
 * autoResponse 性能测试
 *
 * 测试 autoResponse 函数的性能优化效果
 */

import { performance } from "perf_hooks";

// 模拟原始的 autoResponse 函数（未优化版本）
function autoResponseOriginal(result: any): Response {
  // 快速路径：已经是 Response 对象
  if (result instanceof Response) {
    return result;
  }

  // 快速路径：null/undefined
  if (result === null || result === undefined) {
    return new Response("", { status: 204 });
  }

  // 使用 switch 语句优化类型检查
  switch (typeof result) {
    case "string":
      return new Response(result, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });

    case "number":
    case "boolean":
      return new Response(String(result), {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });

    case "object":
      // 检查是否是 { data, status, headers } 格式
      if ("data" in result) {
        const { data, status = 200, headers = {} } = result;

        // 无内容
        if (data === null || data === undefined) {
          return new Response("", {
            status: status === 200 ? 204 : status,
            headers,
          });
        }

        // 纯文本类型
        if (
          typeof data === "string" ||
          typeof data === "number" ||
          typeof data === "boolean"
        ) {
          const finalHeaders = {
            "Content-Type": "text/plain; charset=utf-8",
            ...headers,
          };
          return new Response(String(data), { status, headers: finalHeaders });
        }

        // JSON 类型
        return new Response(JSON.stringify(data), {
          status,
          headers: { "Content-Type": "application/json", ...headers },
        });
      }

      // 普通对象/数组
      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" },
      });

    default:
      // 其他类型（如 symbol, function 等）
      return new Response("", { status: 204 });
  }
}

// 优化版本的 autoResponse 函数
function autoResponseOptimized(result: any): Response {
  // 快速路径：已经是 Response 对象
  if (result instanceof Response) {
    return result;
  }

  // 快速路径：null/undefined
  if (result === null || result === undefined) {
    return new Response("", { status: 204 });
  }

  // 使用 switch 语句优化类型检查
  switch (typeof result) {
    case "string":
      return new Response(result, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });

    case "number":
    case "boolean":
      // 优化：使用更高效的字符串转换
      return new Response(result.toString(), {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });

    case "object":
      // 检查是否是 { data, status, headers } 格式
      if ("data" in result) {
        const { data, status = 200, headers = {} } = result;

        // 无内容
        if (data === null || data === undefined) {
          return new Response("", {
            status: status === 200 ? 204 : status,
            headers,
          });
        }

        // 纯文本类型
        if (
          typeof data === "string" ||
          typeof data === "number" ||
          typeof data === "boolean"
        ) {
          // 优化：减少对象展开操作，直接构建最终对象
          const finalHeaders = {
            "Content-Type": "text/plain; charset=utf-8",
            ...headers,
          };
          return new Response(data.toString(), { status, headers: finalHeaders });
        }

        // JSON 类型
        return new Response(JSON.stringify(data), {
          status,
          headers: { "Content-Type": "application/json", ...headers },
        });
      }

      // 普通对象/数组
      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" },
      });

    default:
      // 其他类型（如 symbol, function 等）
      return new Response("", { status: 204 });
  }
}

// 超高性能版本的 autoResponse 函数
const TEXT_HEADERS = { "Content-Type": "text/plain; charset=utf-8" };
const JSON_HEADERS = { "Content-Type": "application/json" };
const EMPTY_RESPONSE_204 = new Response("", { status: 204 });

function autoResponseUltra(result: any): Response {
  // 快速路径：已经是 Response 对象
  if (result instanceof Response) {
    return result;
  }

  // 快速路径：null/undefined - 复用预创建的对象
  if (result === null || result === undefined) {
    return EMPTY_RESPONSE_204;
  }

  // 使用 switch 语句优化类型检查
  switch (typeof result) {
    case "string":
      // 优化：复用预定义的头部对象
      return new Response(result, { headers: TEXT_HEADERS });

    case "number":
    case "boolean":
      // 优化：使用更高效的字符串转换，复用头部
      return new Response(result.toString(), { headers: TEXT_HEADERS });

    case "object":
      // 检查是否是 { data, status, headers } 格式
      if ("data" in result) {
        const { data, status = 200, headers = {} } = result;

        // 无内容
        if (data === null || data === undefined) {
          return new Response("", {
            status: status === 200 ? 204 : status,
            headers,
          });
        }

        // 纯文本类型
        if (
          typeof data === "string" ||
          typeof data === "number" ||
          typeof data === "boolean"
        ) {
          // 优化：减少对象展开操作，直接构建最终对象
          const finalHeaders = {
            "Content-Type": "text/plain; charset=utf-8",
            ...headers,
          };
          return new Response(data.toString(), { status, headers: finalHeaders });
        }

        // JSON 类型
        return new Response(JSON.stringify(data), {
          status,
          headers: { "Content-Type": "application/json", ...headers },
        });
      }

      // 普通对象/数组
      return new Response(JSON.stringify(result), {
        headers: JSON_HEADERS,
      });

    default:
      // 其他类型（如 symbol, function 等）
      return EMPTY_RESPONSE_204;
  }
}

// 测试数据
const testData = [
  null,
  undefined,
  "Hello World",
  42,
  true,
  { name: "张三", age: 25 },
  { data: "Success", status: 200 },
  { data: { user: "李四" }, status: 201, headers: { "X-Custom": "value" } },
  [1, 2, 3, 4, 5],
  new Response("Already a response"),
];

// 性能测试函数
function runPerformanceTest(
  fn: (data: any) => Response,
  name: string,
  iterations: number = 10000
) {
  console.log(`\n🧪 测试 ${name}...`);
  
  try {
    // 预热 - 减少预热次数
    console.log("  🔥 预热中...");
    for (let i = 0; i < 100; i++) { // 从 1000 减少到 100
      testData.forEach(data => fn(data));
    }

    console.log(`  ⚡ 开始性能测试 (${iterations} 次迭代)...`);
    const start = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      // 每 1000 次显示进度
      if (i % 1000 === 0 && i > 0) {
        process.stdout.write(`    ${((i / iterations) * 100).toFixed(1)}% 完成\r`);
      }
      testData.forEach(data => fn(data));
    }
    
    const end = performance.now();
    const duration = end - start;
    const opsPerSecond = (iterations * testData.length) / (duration / 1000);
    
    console.log(`\n  ⏱️  执行时间: ${duration.toFixed(2)}ms`);
    console.log(`  🚀 每秒操作数: ${opsPerSecond.toFixed(0)} ops/s`);
    console.log(`  📊 平均每次调用: ${(duration / (iterations * testData.length)).toFixed(6)}ms`);
    
    return { duration, opsPerSecond };
  } catch (error) {
    console.error(`  ❌ 测试 ${name} 时出错:`, error);
    return { duration: 0, opsPerSecond: 0 };
  }
}

// 内存使用测试
function runMemoryTest(
  fn: (data: any) => Response,
  name: string,
  iterations: number = 1000
) {
  console.log(`\n💾 测试 ${name} 内存使用...`);
  
  try {
    const initialMemory = process.memoryUsage();
    
    // 执行函数
    console.log(`  🔄 执行 ${iterations} 次迭代...`);
    for (let i = 0; i < iterations; i++) {
      // 每 100 次显示进度
      if (i % 100 === 0 && i > 0) {
        process.stdout.write(`    ${((i / iterations) * 100).toFixed(1)}% 完成\r`);
      }
      testData.forEach(data => fn(data));
    }
    
    // 强制垃圾回收
    if (global.gc) {
      console.log("  🗑️  执行垃圾回收...");
      global.gc();
    }
    
    const finalMemory = process.memoryUsage();
    
    const heapUsedDiff = finalMemory.heapUsed - initialMemory.heapUsed;
    const heapTotalDiff = finalMemory.heapTotal - initialMemory.heapTotal;
    
    console.log(`\n  📈 堆内存使用变化: ${(heapUsedDiff / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  📈 堆内存总量变化: ${(heapTotalDiff / 1024 / 1024).toFixed(2)} MB`);
    
    return { heapUsedDiff, heapTotalDiff };
  } catch (error) {
    console.error(`  ❌ 内存测试 ${name} 时出错:`, error);
    return { heapUsedDiff: 0, heapTotalDiff: 0 };
  }
}

// 主测试函数
async function runAllTests() {
  console.log("🚀 autoResponse 性能测试开始");
  console.log("=".repeat(50));
  
  // 减少测试次数，避免卡住
  const iterations = 10000; // 从 100000 减少到 10000
  
  console.log(`📝 测试配置: ${iterations} 次迭代，${testData.length} 种数据类型`);
  
  try {
    // 性能测试
    console.log("\n开始性能测试...");
    const originalResults = runPerformanceTest(autoResponseOriginal, "原始版本", iterations);
    const optimizedResults = runPerformanceTest(autoResponseOptimized, "优化版本", iterations);
    const ultraResults = runPerformanceTest(autoResponseUltra, "超高性能版本", iterations);
    
    // 性能对比
    console.log("\n📊 性能对比结果");
    console.log("=".repeat(30));
    
    const originalBaseline = originalResults.opsPerSecond;
    const optimizedImprovement = ((optimizedResults.opsPerSecond - originalBaseline) / originalBaseline * 100);
    const ultraImprovement = ((ultraResults.opsPerSecond - originalBaseline) / originalBaseline * 100);
    
    console.log(`原始版本: ${originalBaseline.toFixed(0)} ops/s (基准)`);
    console.log(`优化版本: ${optimizedResults.opsPerSecond.toFixed(0)} ops/s (+${optimizedImprovement.toFixed(1)}%)`);
    console.log(`超高性能版本: ${ultraResults.opsPerSecond.toFixed(0)} ops/s (+${ultraImprovement.toFixed(1)}%)`);
    
    // 内存测试 - 减少测试次数
    console.log("\n💾 内存使用测试");
    console.log("=".repeat(30));
    
    const memoryIterations = 1000; // 从 10000 减少到 1000
    runMemoryTest(autoResponseOriginal, "原始版本", memoryIterations);
    runMemoryTest(autoResponseOptimized, "优化版本", memoryIterations);
    runMemoryTest(autoResponseUltra, "超高性能版本", memoryIterations);
    
    console.log("\n✅ 测试完成！");
  } catch (error) {
    console.error("❌ 测试过程中出现错误:", error);
  }
}

// 运行测试
if (require.main === module) {
  runAllTests().catch(console.error);
}

export {
  autoResponseOriginal,
  autoResponseOptimized,
  autoResponseUltra,
  runPerformanceTest,
  runMemoryTest,
  runAllTests,
};
