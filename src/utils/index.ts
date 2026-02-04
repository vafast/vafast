/**
 * 工具函数模块导出
 */

// 请求解析
export {
  parseBody,
  parseQuery,
  parseQueryFast,
  parseHeaders,
  getHeader,
  parseCookies,
  parseCookiesFast,
  getCookie,
} from "./parsers";

// 响应工具
export { json, text, html, redirect, empty, stream, err } from "./response";

// Go 风格错误处理
export { goAwait } from "./go-await";

// Base64 编码
export { base64urlEncode, base64urlDecode } from "./base64url";


// HTML 渲染 (SSR)
export { HtmlRenderer } from "./html-renderer";

// 依赖管理
export { DependencyManager } from "./dependency-manager";

// 验证器（JIT 编译 + Format 支持）
export {
  validateSchema,
  validateSchemaOrThrow,
  validateFast,
  validateAllSchemas,
  precompileSchemas,
  createValidator,
  getValidatorCacheStats,
  type SchemaConfig,
  type ValidationError,
  type ValidationResult,
} from "./validators/validators";

// Format 验证器（内置常用 format）
export {
  registerFormats,
  registerFormat,
  hasFormat,
  Patterns,
} from "./formats";

// SSE (Server-Sent Events) 类型
export { type SSEEvent } from "./sse";

// 路由注册表
export {
  RouteRegistry,
  createRouteRegistry,
  // 全局访问函数（Server 创建后可在任意位置使用）
  getRouteRegistry,
  getRoute,
  getAllRoutes,
  filterRoutes,
  getRoutesByMethod,
  type RouteMeta,
} from "./route-registry";

// API Spec 生成
export { getApiSpec, generateAITools, type ApiSpec } from "./contract";
