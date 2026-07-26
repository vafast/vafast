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

// 重新导出 TypeBox（与脚手架一致：用户/插件从 vafast 取，勿另装冲突版本）
export {
	Type,
	FormatRegistry,
	Kind,
	type Static,
	type TSchema,
} from "@sinclair/typebox";
export { Value } from "@sinclair/typebox/value";

// 自动注册内置 format 验证器
import { registerFormats } from "./utils/formats";
registerFormats();
