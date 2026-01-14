/** HTTP 方法 */
export type Method =
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "OPTIONS"
  | "HEAD";

/** 支持的响应类型 */
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

/** Handler 类型（统一为 Request -> Response） */
export type Handler = (req: Request) => Response | Promise<Response>;

/** 中间件类型 */
export type Middleware = (
  req: Request,
  next: (ctx?: unknown) => Promise<Response>,
) => Response | Promise<Response>;
