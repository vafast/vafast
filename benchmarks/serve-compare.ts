/**
 * Bun.serve vs node:http 在 Bun 下的性能对比
 *
 * 运行方式：
 * bun run benchmarks/serve-compare.ts
 *
 * 测试方式：
 * wrk -t4 -c100 -d10s http://localhost:3001/  # Bun.serve
 * wrk -t4 -c100 -d10s http://localhost:3002/  # node:http
 */

import { createServer } from "node:http";

const handler = () => new Response("Hello World");

// 1. Bun.serve（原生）
const bunServer = Bun.serve({
  port: 4001,
  fetch: handler,
});

console.log(`Bun.serve running on http://localhost:${bunServer.port}`);

// 2. node:http（兼容层）
const nodeServer = createServer(async (req, res) => {
  const response = handler();
  res.writeHead(response.status);
  res.end(await response.text());
});

nodeServer.listen(4002, () => {
  console.log("node:http running on http://localhost:4002");
});

console.log("\n测试命令：");
console.log("wrk -t4 -c100 -d10s http://localhost:3001/  # Bun.serve");
console.log("wrk -t4 -c100 -d10s http://localhost:3002/  # node:http");
console.log("\n按 Ctrl+C 退出");
