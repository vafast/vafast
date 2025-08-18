import { Route } from "..";

// 定义中间件类型
export interface Middleware {
  (req: Request, next: () => Promise<Response>): Promise<Response>;
}

// 基础路由配置
export interface BaseRouteConfig {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  handler: (req: Request) => Response | Promise<Response>;
}

// 扩展的路由配置 - 只保留Schema验证和中间件
export interface ExtendedRouteConfig extends BaseRouteConfig {
  // Tirne 中间件系统
  middleware?: Middleware[];

  // Schema验证配置
  body?: any;
  query?: any;
  params?: any;
  headers?: any;
  cookies?: any;

  // 其他配置
  docs?: {
    description?: string;
    tags?: string[];
    security?: any[];
    responses?: Record<string, any>;
  };
  timeout?: number;
  maxBodySize?: string;

  // 允许任意扩展
  [key: string]: any;
}

// 嵌套路由配置
export interface NestedRouteConfig {
  path: string;
  middleware?: Middleware[];
  children?: (NestedRouteConfig | ExtendedRouteConfig)[];
}

// 类型安全的路由
export type TypedRoute = ExtendedRouteConfig;

// 兼容类型：可以接受Route或TypedRoute
export type CompatibleRoute = Route | TypedRoute;

// 扁平化后的路由，包含完整的中间件链
export interface FlattenedRoute extends ExtendedRouteConfig {
  fullPath: string;
  middlewareChain: Middleware[];
}
