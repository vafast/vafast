export * from "./server/index.js";
export * from "./middleware.js";
export * from "./utils/index.js";
export * from "./router/index.js";
export * from "./middleware/authMiddleware.js";
export * from "./middleware/rateLimit.js";
export * from "./middleware/cors.js";
export * from "./auth/token.js";
export * from "./middleware/auth.js";
export * from "./defineRoute.js";
export * from "./types/index.js";

// 统一的 serve 函数（自动适配 Bun/Node.js）
export { serve } from "./serve.js";
export type { ServeOptions, ServeResult, FetchHandler } from "./serve.js";

// 重新导出 Type 以便用户使用
export { Type } from "@sinclair/typebox";
