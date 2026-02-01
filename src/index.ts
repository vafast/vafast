export * from "./server";
export * from "./middleware";
export * from "./utils";
export * from "./router";
export * from "./defineRoute";
export * from "./types";

// 统一的 serve 函数
export { serve } from "./serve";
export type {
  ServeOptions,
  ServeResult,
  FetchHandler,
  GracefulShutdownOptions,
  RequestTimeoutOptions,
  TrustProxyOption,
} from "./serve";

// 重新导出 TypeBox 类型
export { Type, FormatRegistry } from "@sinclair/typebox";

// 自动注册内置 format 验证器
import { registerFormats } from "./utils/formats";
registerFormats();
