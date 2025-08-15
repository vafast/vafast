// /**
//  * 综合框架性能测试 - 对比主流框架与 tirne 原生框架
//  * 包含简单响应和复杂验证器两种场景的性能测试
//  */

// import { Elysia, t } from "elysia";
// import { Hono } from "hono";
// import { tbValidator } from "@hono/typebox-validator";
// import { GET } from "../src/utils";
// import { Type } from "@sinclair/typebox";
// import express from "express";
// import { TypeCompiler } from "@sinclair/typebox/compiler";

// // ============================================================================
// // 测试配置
// // ============================================================================
// const TEST_CONFIG = {
//   iterations: 500_000, // 单线程测试次数
//   concurrency: 100, // 并发测试线程数
//   totalRequests: 5_000_000, // 并发测试总请求数
//   warmupRequests: 1000, // 预热请求数
//   validatorIterations: 1000, // 验证器测试次数
//   validatorRuns: 5, // 验证器测试运行次数
// };

// // ============================================================================
// // 简单响应测试配置
// // ============================================================================
// const simpleMessage = "Hello, World!";

// // 1. 原生 Response - 性能基准
// const nativeResponse = () =>
//   new Response(simpleMessage, {
//     headers: { "Content-Type": "text/plain" },
//   });

// // 2. Elysia 框架
// const elysiaApp = new Elysia().get("/", () => simpleMessage);

// // 3. Hono 框架
// const honoApp = new Hono().get("/", (c) => c.text(simpleMessage));

// // 4. Express 框架
// const expressApp = express();
// expressApp.get("/", (req, res) => {
//   res.set("Content-Type", "text/plain");
//   res.send(simpleMessage);
// });

// // Express 请求处理函数
// async function handleExpressRequest(req: Request): Promise<Response> {
//   const url = new URL(req.url);
//   if (url.pathname === "/") {
//     return new Response(simpleMessage, {
//       headers: { "Content-Type": "text/plain" },
//     });
//   }
//   return new Response("Not Found", { status: 404 });
// }

// // 5. tirne 原生 - 直接路由
// const tirneRoutesDirect = [
//   {
//     method: "GET",
//     path: "/",
//     handler: () =>
//       new Response(simpleMessage, {
//         headers: { "Content-Type": "text/plain" },
//       }),
//   },
// ];

// // 6. tirne 原生 - 工厂路由
// const tirneRoutesFactory = [
//   GET("/", () => {
//     return new Response(simpleMessage, {
//       headers: { "Content-Type": "text/plain" },
//     });
//   }),
// ];

// // 7. tirne 原生 - 带验证版本
// const tirneRoutesFull = [
//   GET(
//     "/",
//     () => {
//       return new Response(simpleMessage, {
//         headers: { "Content-Type": "text/plain" },
//       });
//     },
//     {
//       body: undefined,
//       query: undefined,
//       params: undefined,
//       headers: undefined,
//       cookies: undefined,
//     }
//   ),
// ];

// // ============================================================================
// // 复杂验证器测试配置
// // ============================================================================
// const TestSchema = Type.Object({
//   user: Type.Object({
//     id: Type.String({ minLength: 1, maxLength: 100 }),
//     name: Type.String({ minLength: 1, maxLength: 100 }),
//     email: Type.String({ minLength: 5, maxLength: 100 }),
//     age: Type.Number({ minimum: 0, maximum: 150 }),
//     profile: Type.Object({
//       bio: Type.Optional(Type.String({ maxLength: 500 })),
//       avatar: Type.Optional(Type.String({ maxLength: 200 })),
//       preferences: Type.Object({
//         theme: Type.Union([Type.Literal("light"), Type.Literal("dark")]),
//         notifications: Type.Boolean(),
//         language: Type.String({ minLength: 2, maxLength: 5 }),
//       }),
//     }),
//     tags: Type.Array(Type.String(), { minItems: 0, maxItems: 10 }),
//     metadata: Type.Record(Type.String(), Type.Any()),
//   }),
//   timestamp: Type.String({ maxLength: 50 }),
//   version: Type.String({ maxLength: 20 }),
// });

// const testData = {
//   user: {
//     id: "12345",
//     name: "John Doe",
//     email: "john@example.com",
//     age: 30,
//     profile: {
//       bio: "Software Developer",
//       avatar: "https://example.com/avatar.jpg",
//       preferences: {
//         theme: "dark",
//         notifications: true,
//         language: "en",
//       },
//     },
//     tags: ["developer", "typescript", "nodejs"],
//     metadata: {
//       lastLogin: "2024-01-01T00:00:00Z",
//       role: "admin",
//     },
//   },
//   timestamp: new Date().toISOString(),
//   version: "1.0.0",
// };

// // tirne 原生验证器路由
// const tirneValidatorRoutes = [
//   GET(
//     "/",
//     (req, body, query, params, headers, cookies) => {
//       return new Response(JSON.stringify({ message: "Hello World", data: body }));
//     },
//     {
//       body: TestSchema,
//       query: TestSchema,
//     }
//   ),
// ];

// // Elysia 验证器应用
// const elysiaValidatorApp = new Elysia().post(
//   "/",
//   ({ body, query, params }) => {
//     return { message: "Hello World", data: { body, query, params } };
//   },
//   {
//     body: TestSchema,
//     query: TestSchema,
//   }
// );

// // Hono 验证器应用
// const honoValidatorApp = new Hono().post(
//   "/",
//   tbValidator("json", TestSchema),
//   tbValidator("query", TestSchema),
//   async (c) => {
//     const body = c.req.valid("json");
//     const query = c.req.valid("query");
//     return c.json({ message: "Hello World", data: { body, query } });
//   }
// );

// // Express 验证器应用
// const expressValidatorApp = express();
// expressValidatorApp.use(express.json());
// expressValidatorApp.post("/", (req, res) => {
//   try {
//     const compiler = TypeCompiler.Compile(TestSchema);

//     // 验证 body
//     const bodyValid = compiler.Check(req.body);
//     if (!bodyValid) {
//       const bodyErrors = compiler.Errors(req.body);
//       return res.status(400).json({ error: "Body validation failed", details: bodyErrors });
//     }

//     // 验证 query
//     const queryValid = compiler.Check(req.query);
//     if (!queryValid) {
//       const queryErrors = compiler.Errors(req.query);
//       return res.status(400).json({ error: "Query validation failed", details: queryErrors });
//     }

//     res.json({
//       message: "Hello World",
//       data: { body: req.body, query: req.query },
//     });
//   } catch (error) {
//     res.status(400).json({ error: "Validation failed" });
//   }
// });

// // ============================================================================
// // 性能测试函数
// // ============================================================================

// // 简单响应测试函数
// async function benchmarkFramework(
//   name: string,
//   handler: (req: Request) => Response | Promise<Response>,
//   iterations: number = TEST_CONFIG.iterations
// ) {
//   const testRequest = new Request("http://localhost:3000/");

//   // 预热
//   for (let i = 0; i < TEST_CONFIG.warmupRequests; i++) {
//     await handler(testRequest);
//   }

//   const start = performance.now();
//   for (let i = 0; i < iterations; i++) {
//     await handler(testRequest);
//   }
//   const end = performance.now();

//   const duration = end - start;
//   const rps = Math.round(iterations / (duration / 1000));

//   return { name, rps, duration };
// }

// // 并发测试函数
// async function concurrentBenchmark(
//   name: string,
//   handler: (req: Request) => Response | Promise<Response>,
//   concurrency: number = TEST_CONFIG.concurrency,
//   totalRequests: number = TEST_CONFIG.totalRequests
// ) {
//   const testRequest = new Request("http://localhost:3000/");
//   const requestsPerWorker = Math.ceil(totalRequests / concurrency);

//   const start = performance.now();
//   const workers = Array.from({ length: concurrency }, async () => {
//     for (let i = 0; i < requestsPerWorker; i++) {
//       await handler(testRequest);
//     }
//   });

//   await Promise.all(workers);
//   const end = performance.now();

//   const duration = end - start;
//   const rps = Math.round(totalRequests / (duration / 1000));

//   return { name, rps, duration, concurrency };
// }

// // 验证器测试函数
// async function runValidatorBenchmark(
//   handler: (req: Request) => Response | Promise<Response>,
//   iterations: number = TEST_CONFIG.validatorIterations
// ) {
//   const testRequest = new Request("http://localhost:3000/", {
//     method: "POST",
//     headers: { "content-type": "application/json" },
//     body: JSON.stringify(testData),
//   });

//   // 预热
//   for (let i = 0; i < TEST_CONFIG.warmupRequests; i++) {
//     const newRequest = new Request(testRequest.url, {
//       method: testRequest.method,
//       headers: testRequest.headers,
//       body: JSON.stringify(testData),
//     });
//     await handler(newRequest);
//   }

//   const start = performance.now();
//   for (let i = 0; i < iterations; i++) {
//     const newRequest = new Request(testRequest.url, {
//       method: testRequest.method,
//       headers: testRequest.headers,
//       body: JSON.stringify(testData),
//     });
//     await handler(newRequest);
//   }
//   const end = performance.now();

//   const duration = end - start;
//   const rps = Math.round(iterations / (duration / 1000));

//   return { duration, rps };
// }

// // 多次验证器测试函数
// async function benchmarkValidator(
//   name: string,
//   handler: (req: Request) => Response | Promise<Response>,
//   iterations: number = TEST_CONFIG.validatorIterations,
//   runs: number = TEST_CONFIG.validatorRuns
// ) {
//   const results: { duration: number; rps: number }[] = [];

//   for (let run = 1; run <= runs; run++) {
//     const result = await runValidatorBenchmark(handler, iterations);
//     results.push(result);
//   }

//   // 计算平均值
//   const avgRps = Math.round(results.reduce((sum, r) => sum + r.rps, 0) / results.length);
//   const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;

//   return { name, rps: avgRps, duration: avgDuration, runs };
// }

// // ============================================================================
// // 工具函数
// // ============================================================================
// function formatPerformance(rps: number): string {
//   if (rps >= 1_000_000) {
//     return `${(rps / 1_000_000).toFixed(2)}M`;
//   } else if (rps >= 1_000) {
//     return `${(rps / 1_000).toFixed(2)}K`;
//   } else {
//     return rps.toString();
//   }
// }

// // ============================================================================
// // 主测试函数
// // ============================================================================
// async function runComprehensiveBenchmark() {
//   console.log("🚀 开始综合框架性能测试");
//   console.log("=".repeat(80));
//   console.log("💡 测试目标:");
//   console.log("   • 简单响应性能测试");
//   console.log("   • 复杂验证器性能测试");
//   console.log("   • 对比主流框架与 tirne 原生框架");
//   console.log("   • 验证框架优化效果");

//   // ============================================================================
//   // 第一部分：简单响应性能测试
//   // ============================================================================
//   console.log("\n" + "=".repeat(80));
//   console.log("📊 第一部分：简单响应性能测试");
//   console.log("=".repeat(80));
//   console.log(
//     `📋 测试配置: ${TEST_CONFIG.iterations.toLocaleString()} 次迭代, ${
//       TEST_CONFIG.concurrency
//     } 个并发线程, ${TEST_CONFIG.totalRequests.toLocaleString()} 个并发请求`
//   );

//   // 单线程性能测试
//   console.log("\n🔍 单线程性能测试结果:");
//   console.log("-".repeat(50));

//   const nativeResult = await benchmarkFramework("原生 Response", async () => {
//     return nativeResponse();
//   });

//   const elysiaResult = await benchmarkFramework("Elysia", async (req) => {
//     return await elysiaApp.handle(req);
//   });

//   const honoResult = await benchmarkFramework("Hono", async (req) => {
//     return await honoApp.fetch(req);
//   });

//   const expressResult = await benchmarkFramework("Express", handleExpressRequest);

//   const tirneDirectResult = await benchmarkFramework("tirne原生 (直接路由)", async () => {
//     const route = tirneRoutesDirect[0]!;
//     return await route.handler();
//   });

//   const tirneFactoryResult = await benchmarkFramework("tirne原生 (工厂路由)", async (req) => {
//     const route = tirneRoutesFactory[0]!;
//     return await route.handler(req);
//   });

//   const tirneFullResult = await benchmarkFramework("tirne原生 (带验证版本)", async (req) => {
//     const route = tirneRoutesFull[0]!;
//     return await route.handler(req);
//   });

//   // 并发性能测试
//   console.log("\n🚀 并发性能测试结果:");
//   console.log("-".repeat(50));

//   const nativeConcurrentResult = await concurrentBenchmark("原生 Response", async () => {
//     return nativeResponse();
//   });

//   const elysiaConcurrentResult = await concurrentBenchmark("Elysia", async (req) => {
//     return await elysiaApp.handle(req);
//   });

//   const honoConcurrentResult = await concurrentBenchmark("Hono", async (req) => {
//     return await honoApp.fetch(req);
//   });

//   const expressConcurrentResult = await concurrentBenchmark("Express", handleExpressRequest);

//   const tirneDirectConcurrentResult = await concurrentBenchmark(
//     "tirne原生 (直接路由)",
//     async () => {
//       const route = tirneRoutesDirect[0]!;
//       return await route.handler();
//     }
//   );

//   const tirneFactoryConcurrentResult = await concurrentBenchmark(
//     "tirne原生 (工厂路由)",
//     async (req) => {
//       const route = tirneRoutesFactory[0]!;
//       return await route.handler(req);
//     }
//   );

//   const tirneFullConcurrentResult = await concurrentBenchmark(
//     "tirne原生 (带验证版本)",
//     async (req) => {
//       const route = tirneRoutesFull[0]!;
//       return await route.handler(req);
//     }
//   );

//   // ============================================================================
//   // 第二部分：复杂验证器性能测试
//   // ============================================================================
//   console.log("\n" + "=".repeat(80));
//   console.log("📊 第二部分：复杂验证器性能测试");
//   console.log("=".repeat(80));
//   console.log(
//     `📋 测试配置: ${TEST_CONFIG.validatorIterations.toLocaleString()} 次请求, ${
//       TEST_CONFIG.validatorRuns
//     } 次运行, 包含 TypeBox 验证器`
//   );

//   console.log("\n🔍 验证器性能测试结果:");
//   console.log("-".repeat(50));

//   const expressValidatorResult = await benchmarkValidator(
//     "Express (TypeBox验证器)",
//     async (req) => {
//       // 模拟 Express 验证器处理
//       const body = await req.json();
//       const compiler = TypeCompiler.Compile(TestSchema);
//       const isValid = compiler.Check(body);
//       if (!isValid) {
//         return new Response(JSON.stringify({ error: "Validation failed" }), { status: 400 });
//       }
//       return new Response(JSON.stringify({ message: "Hello World", data: body }));
//     }
//   );

//   const tirneValidatorResult = await benchmarkValidator(
//     "tirne原生 (TypeBox验证器)",
//     async (req) => {
//       const route = tirneValidatorRoutes[0]!;
//       return await route.handler(req);
//     }
//   );

//   const elysiaValidatorResult = await benchmarkValidator("Elysia (TypeBox验证器)", async (req) => {
//     return await elysiaValidatorApp.handle(req);
//   });

//   const honoValidatorResult = await benchmarkValidator("Hono (TypeBox验证器)", async (req) => {
//     return await honoValidatorApp.fetch(req);
//   });

//   // ============================================================================
//   // 综合性能报告
//   // ============================================================================
//   console.log("\n" + "=".repeat(80));
//   console.log("🏆 综合框架性能测试报告");
//   console.log("=".repeat(80));

//   // 简单响应测试结果
//   console.log("\n📊 简单响应性能测试结果:");
//   console.log("-".repeat(50));

//   const singleThreadResults = [
//     nativeResult,
//     tirneDirectResult,
//     tirneFactoryResult,
//     elysiaResult,
//     honoResult,
//     tirneFullResult,
//     expressResult,
//   ];
//   singleThreadResults.sort((a, b) => b.rps - a.rps);

//   singleThreadResults.forEach((result, index) => {
//     const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "📊";
//     const rpsFormatted = formatPerformance(result.rps).padStart(8);
//     console.log(`${medal} ${result.name.padEnd(30)}: ${rpsFormatted} 请求/秒`);
//   });

//   const concurrentResults = [
//     nativeConcurrentResult,
//     tirneDirectConcurrentResult,
//     tirneFactoryConcurrentResult,
//     elysiaConcurrentResult,
//     honoConcurrentResult,
//     tirneFullConcurrentResult,
//     expressConcurrentResult,
//   ];
//   concurrentResults.sort((a, b) => b.rps - a.rps);

//   console.log("\n🚀 并发性能测试结果:");
//   console.log("-".repeat(50));
//   concurrentResults.forEach((result, index) => {
//     const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "📊";
//     const rpsFormatted = formatPerformance(result.rps).padStart(8);
//     console.log(`${medal} ${result.name.padEnd(30)}: ${rpsFormatted} 请求/秒`);
//   });

//   // 验证器测试结果
//   console.log("\n🔍 复杂验证器性能测试结果:");
//   console.log("-".repeat(50));

//   const validatorResults = [
//     expressValidatorResult,
//     tirneValidatorResult,
//     elysiaValidatorResult,
//     honoValidatorResult,
//   ];
//   validatorResults.sort((a, b) => b.rps - a.rps);

//   validatorResults.forEach((result, index) => {
//     const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "📊";
//     const rpsFormatted = formatPerformance(result.rps).padStart(8);
//     console.log(`${medal} ${result.name.padEnd(30)}: ${rpsFormatted} 请求/秒`);
//   });

//   // ============================================================================
//   // 性能分析
//   // ============================================================================
//   console.log("\n" + "=".repeat(80));
//   console.log("📈 综合性能分析");
//   console.log("=".repeat(80));

//   // 简单响应性能分析
//   const fastestSimple = singleThreadResults[0]!;
//   const slowestSimple = singleThreadResults[singleThreadResults.length - 1]!;
//   const simplePerformanceGap = ((fastestSimple.rps / slowestSimple.rps - 1) * 100).toFixed(1);

//   console.log("\n🔍 简单响应性能分析:");
//   console.log("-".repeat(50));
//   console.log(`🏆 最快: ${fastestSimple.name} (${formatPerformance(fastestSimple.rps)} 请求/秒)`);
//   console.log(`🐌 最慢: ${slowestSimple.name} (${formatPerformance(slowestSimple.rps)} 请求/秒)`);
//   console.log(`📊 性能差距: ${simplePerformanceGap}%`);

//   // 验证器性能分析
//   const fastestValidator = validatorResults[0]!;
//   const slowestValidator = validatorResults[validatorResults.length - 1]!;
//   const validatorPerformanceGap = ((fastestValidator.rps / slowestValidator.rps - 1) * 100).toFixed(
//     1
//   );

//   console.log("\n🔍 验证器性能分析:");
//   console.log("-".repeat(50));
//   console.log(
//     `🏆 最快: ${fastestValidator.name} (${formatPerformance(fastestValidator.rps)} 请求/秒)`
//   );
//   console.log(
//     `🐌 最慢: ${slowestValidator.name} (${formatPerformance(slowestValidator.rps)} 请求/秒)`
//   );
//   console.log(`📊 性能差距: ${validatorPerformanceGap}%`);

//   // tirne 原生框架性能分析
//   console.log("\n🔍 tirne 原生框架性能分析:");
//   console.log("-".repeat(50));

//   if (tirneDirectResult.rps > 0) {
//     const factoryVsDirect = ((tirneFactoryResult.rps / tirneDirectResult.rps - 1) * 100).toFixed(1);
//     const fullVsDirect = ((tirneFullResult.rps / tirneDirectResult.rps - 1) * 100).toFixed(1);

//     console.log(`📈 工厂路由 vs 直接路由: ${factoryVsDirect}% 性能差异`);
//     console.log(`📈 带验证版本 vs 直接路由: ${fullVsDirect}% 性能差异`);
//   }

//   // 与主流框架对比
//   console.log("\n🔍 与主流框架性能对比:");
//   console.log("-".repeat(50));

//   if (elysiaResult.rps > 0 && tirneDirectResult.rps > 0) {
//     const elysiaVsTirne = (elysiaResult.rps / tirneDirectResult.rps).toFixed(1);
//     console.log(`📊 Elysia vs tirne原生直接路由: ${elysiaVsTirne}x 性能比`);
//   }

//   if (expressResult.rps > 0 && tirneDirectResult.rps > 0) {
//     const expressVsTirne = (expressResult.rps / tirneDirectResult.rps).toFixed(1);
//     console.log(`📊 Express vs tirne原生直接路由: ${expressVsTirne}x 性能比`);
//   }

//   // 场景适用性分析
//   console.log("\n🎯 场景适用性分析:");
//   console.log("-".repeat(50));
//   console.log("✅ 极简路由: 使用直接路由 (性能最佳)");
//   console.log("✅ 简单路由: 使用工厂路由 (平衡性能与功能)");
//   console.log("✅ 复杂业务: 使用带验证版本 (功能最全)");
//   console.log("💡 根据实际需求选择合适的实现方式");

//   console.log("\n📊 综合框架性能测试完成");
// }

// // 运行测试
// runComprehensiveBenchmark();
