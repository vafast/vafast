/**
 * @vafast/node-server
 * Node.js 适配器 - 为 Vafast 提供高性能 Node.js 运行时支持
 *
 * @example
 * ```ts
 * import { serve } from "@vafast/node-server";
 * import { Server } from "vafast";
 *
 * const app = new Server([
 *   { method: "GET", path: "/", handler: () => "Hello World" },
 * ]);
 *
 * serve({ fetch: app.fetch, port: 3000 }, () => {
 *   console.log("Server running on http://localhost:3000");
 * });
 * ```
 */

export { serve, createAdaptorServer } from "./serve";
export type { ServeOptions, ServeResult, FetchHandler } from "./serve";
export { createProxyRequest } from "./request";
export { writeResponse, writeResponseSimple } from "./response";
