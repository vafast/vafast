export * from "./server";
export * from "./middleware";
export * from "./utils";
export * from "./router";
export * from "./middleware/authMiddleware";
export * from "./middleware/rateLimit";
export * from "./middleware/cors";
export * from "./auth/token";
export * from "./middleware/auth";
export * from "./defineRoute";
export * from "./types/index";

// 统一的 serve 函数（自动适配 Bun/Node.js）
export { serve } from "./serve";
export type { ServeOptions, ServeResult, FetchHandler } from "./serve";

// 重新导出 Type 以便用户使用
export { Type } from "@sinclair/typebox";
