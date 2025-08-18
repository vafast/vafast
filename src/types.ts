export type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export type Handler = (
  req: Request,
  params?: Record<string, string>,
  user?: Record<string, any>
) => Response | Promise<Response>;

export type Middleware = (req: Request, next: () => Promise<Response>) => Promise<Response>;

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
