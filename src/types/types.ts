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

/**
 * 扩展的 Request 类型，包含 IP 信息
 * 当启用 trustProxy 时，request 对象会附加这些属性
 */
export interface VafastRequest extends Request {
  /** 客户端真实 IP 地址 */
  readonly ip: string;
  /** 代理链中的所有 IP 地址（X-Forwarded-For 解析结果） */
  readonly ips: string[];
}
