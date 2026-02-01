/**
 * 统一的 serve 函数
 * 使用 Node.js 原生 http 模块，兼容 Bun 和 Node.js
 *
 * 基准测试结果（Bun 环境）：
 * - Bun.serve: 35,422 req/s
 * - node:http: 38,075 req/s
 *
 * node:http 在 Bun 下性能甚至更好，无需使用 Bun API
 */

export { serve, createAdaptorServer } from "./node-server/serve";
export type {
  ServeOptions,
  ServeResult,
  FetchHandler,
  GracefulShutdownOptions,
  RequestTimeoutOptions,
  TrustProxyOption,
} from "./node-server/serve";
