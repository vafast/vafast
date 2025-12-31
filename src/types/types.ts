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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Handler = (
  req: Request,
  params?: Record<string, string>,
  user?: Record<string, any>
) => ResponseBody | Promise<ResponseBody>;

/** 中间件（返回值必须是 Response 或 Promise<Response>） */
export type Middleware = (
  req: Request,
  next: () => Promise<Response>
) => Response | Promise<Response>;

export interface Route {
  method: Method;
  path: string;
  handler: Handler;
  middleware?: Middleware[];
}

// 嵌套路由配置
export interface NestedRoute {
  path: string;
  middleware?: Middleware[];
  children?: (NestedRoute | Route)[];
}

// 扁平化后的路由，包含完整的中间件链
export interface FlattenedRoute extends Route {
  fullPath: string;
  middlewareChain: Middleware[];
}
