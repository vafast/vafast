import type { Middleware } from "./types";

/**
 * 组件路由配置
 * 支持声明式的组件关联
 */
export interface ComponentRoute {
  path: string;
  component: () => Promise<any>;
  middleware?: Middleware[];
}

/**
 * 嵌套组件路由配置
 */
export interface NestedComponentRoute {
  path: string;
  middleware?: Middleware[];
  children?: (ComponentRoute | NestedComponentRoute)[];
}

/**
 * 扁平化后的组件路由
 */
export interface FlattenedComponentRoute extends ComponentRoute {
  fullPath: string;
  middlewareChain: Middleware[];
}
