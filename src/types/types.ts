export type Method =
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "OPTIONS"
  | "HEAD";

/** 支持的响应类型 - 由 mapResponse 自动转换 */
export type ResponseBody =
  | Response
  | string
  | number
  | boolean
  | object
  | null
  | undefined
  | ReadableStream
  | Blob
  | ArrayBuffer;

/** Handler 返回值（支持同步/异步，任意类型） */

/** 传统 Handler 类型 */
export type LegacyHandler = (
  req: Request,
  params?: Record<string, string>,
  user?: Record<string, any>,
) => ResponseBody | Promise<ResponseBody>;

/** createHandler 返回的类型 */
export type FactoryHandler = (req: Request) => Promise<Response>;

/** Handler 联合类型（支持两种风格） */
export type Handler = LegacyHandler | FactoryHandler;

/** 中间件（返回值必须是 Response 或 Promise<Response>） */
export type Middleware = (
  req: Request,
  next: () => Promise<Response>,
) => Response | Promise<Response>;

export interface Route {
  method: Method;
  path: string;
  handler: Handler;
  middleware?: Middleware[];
  /** 路由名称（用于文档、事件等） */
  name?: string;
  /** 路由描述 */
  description?: string;
  /** 允许任意扩展（支持 Webhook、权限等插件） */
  [key: string]: unknown;
}

// 嵌套路由配置
export interface NestedRoute {
  path: string;
  middleware?: Middleware[];
  children?: (NestedRoute | Route)[];
  /** 路由组名称 */
  name?: string;
  /** 路由组描述 */
  description?: string;
  /** 允许任意扩展 */
  [key: string]: unknown;
}

// 扁平化后的路由，包含完整的中间件链
export interface FlattenedRoute extends Route {
  fullPath: string;
  middlewareChain: Middleware[];
}
