/**
 * 工具函数模块导出
 */

// 处理器工厂
export {
  createHandler,
  createHandlerWithExtra,
  simpleHandler,
} from "./create-handler";

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
export { json, text, html, redirect, empty, stream } from "./response";

// Go 风格错误处理
export { goAwait } from "./go-await";

// Base64 编码
export { base64urlEncode, base64urlDecode } from "./base64url";

// 请求上下文
export { setLocals, getLocals } from "./handle";

// 请求验证
export {
  parseRequest,
  validateRequest,
  parseAndValidateRequest,
  createRequestValidator,
} from "./request-validator";

// HTML 渲染 (SSR)
export { HtmlRenderer } from "./html-renderer";

// 依赖管理
export { DependencyManager } from "./dependency-manager";

// 验证器（JIT 编译）
export {
  validateSchema,
  createValidator,
  validateFast,
  precompileSchemas,
  getValidatorCacheStats,
} from "./validators/validators";

