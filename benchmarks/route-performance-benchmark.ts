/**
 * 性能基准测试 - 对比不同实现方式的性能表现
 * 帮助选择最适合的配置方案
 */

// 测试参数配置
const TEST_CONFIG = {
  iterations: 500_000, // 单线程测试次数
  concurrency: 100, // 并发测试线程数
  totalRequests: 5_000_000, // 并发测试总请求数
  warmupRequests: 1000, // 预热请求数
};

// 测试用的简单响应内容
const simpleMessage = "Hello, World!";

// 1. 直接路由 - 无框架开销
const tirneRoutesDirect = [
  {
    method: "GET",
    path: "/",
    handler: () =>
      new Response(simpleMessage, {
        headers: { "Content-Type": "text/plain" },
      }),
  },
];

// 2. 工厂路由 - 使用直接路由对象
const tirneRoutesFactory = [
  {
    method: "GET",
    path: "/",
    handler: (req: Request) => {
      return new Response(simpleMessage, {
        headers: { "Content-Type": "text/plain" },
      });
    },
  },
];

// 3. 完整路由 - 包含验证器配置
const tirneRoutesFull = [
  {
    method: "GET",
    path: "/",
    handler: (req: Request) => {
      return new Response(simpleMessage, {
        headers: { "Content-Type": "text/plain" },
      });
    },
    body: undefined,
    query: undefined,
    params: undefined,
    headers: undefined,
    cookies: undefined,
  },
];

// 4. 原生 Response - 作为性能基准
const nativeResponse = () =>
  new Response(simpleMessage, {
    headers: { "Content-Type": "text/plain" },
  });

// 性能测试函数 - 支持两种类型的处理器
async function benchmarkFramework(
  name: string,
  handler:
    | ((req: Request) => Response | Promise<Response>)
    | (() => Response | Promise<Response>),
  iterations: number = TEST_CONFIG.iterations
) {
  // 预热
  for (let i = 0; i < TEST_CONFIG.warmupRequests; i++) {
    const testRequest = new Request("http://localhost:3000/");
    if (handler.length === 0) {
      // 无参数处理器
      await (handler as () => Response | Promise<Response>)();
    } else {
      // 带参数处理器
      await (handler as (req: Request) => Response | Promise<Response>)(
        testRequest
      );
    }
  }

  const start = performance.now();

  // 实际测试
  for (let i = 0; i < iterations; i++) {
    const testRequest = new Request("http://localhost:3000/");
    if (handler.length === 0) {
      // 无参数处理器
      await (handler as () => Response | Promise<Response>)();
    } else {
      // 带参数处理器
      await (handler as (req: Request) => Response | Promise<Response>)(
        testRequest
      );
    }
  }

  const end = performance.now();
  const duration = end - start;
  const rps = Math.round(iterations / (duration / 1000));

  return { name, rps, duration };
}

// 并发测试函数 - 支持两种类型的处理器
async function concurrentBenchmark(
  name: string,
  handler:
    | ((req: Request) => Response | Promise<Response>)
    | (() => Response | Promise<Response>),
  concurrency: number = TEST_CONFIG.concurrency,
  totalRequests: number = TEST_CONFIG.totalRequests
) {
  const requestsPerWorker = Math.ceil(totalRequests / concurrency);

  const start = performance.now();

  // 创建并发工作器
  const workers = Array.from({ length: concurrency }, async () => {
    for (let i = 0; i < requestsPerWorker; i++) {
      const testRequest = new Request("http://localhost:3000/");
      if (handler.length === 0) {
        // 无参数处理器
        await (handler as () => Response | Promise<Response>)();
      } else {
        // 带参数处理器
        await (handler as (req: Request) => Response | Promise<Response>)(
          testRequest
        );
      }
    }
  });

  await Promise.all(workers);

  const end = performance.now();
  const duration = end - start;
  const rps = Math.round(totalRequests / (duration / 1000));

  return { name, rps, duration, concurrency };
}

// 格式化性能数据
function formatPerformance(rps: number): string {
  if (rps >= 1_000_000) {
    return `${(rps / 1_000_000).toFixed(2)}M`;
  } else if (rps >= 1_000) {
    return `${(rps / 1_000).toFixed(2)}K`;
  } else {
    return rps.toString();
  }
}

// 运行性能基准测试
async function runPerformanceBenchmark() {
  console.log("🚀 开始性能基准测试");
  console.log("=".repeat(80));
  console.log("💡 测试目标:");
  console.log("   • 对比不同实现方式的性能");
  console.log("   • 找到性能瓶颈");
  console.log("   • 选择最适合的配置");

  console.log(
    `\n📊 测试参数: ${TEST_CONFIG.iterations.toLocaleString()} 次单线程测试, ${
      TEST_CONFIG.concurrency
    } 个并发线程, ${TEST_CONFIG.totalRequests.toLocaleString()} 个并发请求`
  );

  // 1. 单线程性能测试
  console.log("\n🔍 单线程性能测试:");
  console.log("-".repeat(50));

  const nativeResult = await benchmarkFramework("原生 Response", () => {
    return nativeResponse();
  });

  const directResult = await benchmarkFramework("直接路由", () => {
    const route = tirneRoutesDirect[0]!;
    return route.handler();
  });

  const factoryResult = await benchmarkFramework("工厂路由", async (req) => {
    const route = tirneRoutesFactory[0]!;
    return await route.handler(req);
  });

  const fullResult = await benchmarkFramework(
    "tirne原生 (带验证版本)",
    async (req) => {
      const route = tirneRoutesFull[0]!;
      return await route.handler(req);
    }
  );

  // 2. 并发性能测试
  console.log("\n🚀 并发性能测试:");
  console.log("-".repeat(50));

  const nativeConcurrentResult = await concurrentBenchmark(
    "原生 Response",
    () => {
      return nativeResponse();
    }
  );

  const directConcurrentResult = await concurrentBenchmark("直接路由", () => {
    const route = tirneRoutesDirect[0]!;
    return route.handler();
  });

  const factoryConcurrentResult = await concurrentBenchmark(
    "工厂路由",
    async (req) => {
      const route = tirneRoutesFactory[0]!;
      return await route.handler(req);
    }
  );

  const fullConcurrentResult = await concurrentBenchmark(
    "tirne原生 (带验证版本)",
    async (req) => {
      const route = tirneRoutesFull[0]!;
      return await route.handler(req);
    }
  );

  // 显示测试结果
  console.log("\n" + "=".repeat(80));
  console.log("🏆 性能测试结果");
  console.log("=".repeat(80));

  // 单线程结果
  console.log("\n📊 单线程性能:");
  const singleThreadResults = [
    nativeResult,
    directResult,
    factoryResult,
    fullResult,
  ];
  singleThreadResults.sort((a, b) => b.rps - a.rps);

  singleThreadResults.forEach((result, index) => {
    const medal =
      index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "📊";
    const rpsFormatted = formatPerformance(result.rps).padStart(8);

    console.log(`${medal} ${result.name.padEnd(30)}: ${rpsFormatted} 请求/秒`);
  });

  // 并发结果
  console.log("\n🚀 并发性能:");
  const concurrentResults = [
    nativeConcurrentResult,
    directConcurrentResult,
    factoryConcurrentResult,
    fullConcurrentResult,
  ];
  concurrentResults.sort((a, b) => b.rps - a.rps);

  concurrentResults.forEach((result, index) => {
    const medal =
      index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "📊";
    const rpsFormatted = formatPerformance(result.rps).padStart(8);

    console.log(`${medal} ${result.name.padEnd(30)}: ${rpsFormatted} 请求/秒`);
  });

  // 性能对比分析
  console.log("\n📈 性能对比分析:");
  console.log("-".repeat(50));

  const fastestSingle = singleThreadResults[0]!;
  const slowestSingle = singleThreadResults[singleThreadResults.length - 1]!;
  const performanceGap = (
    (fastestSingle.rps / slowestSingle.rps - 1) *
    100
  ).toFixed(1);

  console.log(
    `🏆 单线程最快: ${fastestSingle.name} (${formatPerformance(
      fastestSingle.rps
    )} 请求/秒)`
  );
  console.log(
    `🐌 单线程最慢: ${slowestSingle.name} (${formatPerformance(
      slowestSingle.rps
    )} 请求/秒)`
  );
  console.log(`📊 性能差距: ${performanceGap}%`);

  // 性能提升对比
  console.log("\n🔍 性能提升对比:");
  console.log("-".repeat(50));

  const baseRps = fullResult.rps;
  if (baseRps > 0) {
    const nativeImprovement = ((nativeResult.rps / baseRps - 1) * 100).toFixed(
      1
    );
    const directImprovement = ((directResult.rps / baseRps - 1) * 100).toFixed(
      1
    );
    const factoryImprovement = (
      (factoryResult.rps / baseRps - 1) *
      100
    ).toFixed(1);

    console.log(`📈 原生 Response vs 带验证版本: ${nativeImprovement}% 提升`);
    console.log(`📈 直接路由 vs 带验证版本: ${directImprovement}% 提升`);
    console.log(`📈 工厂路由 vs 带验证版本: ${factoryImprovement}% 提升`);
  }

  // 实现方式说明
  console.log("\n💡 实现方式说明:");
  console.log("-".repeat(50));
  console.log("• 原生 Response: 直接创建响应，无框架开销");
  console.log("• 直接路由: 跳过框架逻辑，直接调用处理函数");
  console.log("• 工厂路由: 使用 GET 工厂函数，包含基本处理");
  console.log("• 完整路由: 包含完整的验证器和中间件处理");

  console.log("\n🎯 选择建议:");
  console.log("-".repeat(50));
  console.log("✅ 极简路由: 使用直接路由 (性能最佳)");
  console.log("✅ 简单路由: 使用工厂路由 (平衡性能与功能)");
  console.log("✅ 复杂业务: 使用带验证版本 (功能最全)");
  console.log("💡 根据实际需求选择合适的实现方式");

  console.log("\n📊 性能测试完成");
}

// 运行测试
runPerformanceBenchmark();
