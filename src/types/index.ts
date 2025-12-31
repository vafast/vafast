// 核心类型优先导出（确保使用 types.ts 中的定义）
export type {
  Method,
  Handler,
  Route,
  NestedRoute,
  Middleware,
  FlattenedRoute,
  ResponseBody,
} from "./types";

// 导出扩展类型（不包含与 types.ts 冲突的类型）
export type {
  BaseRouteConfig,
  ExtendedRouteConfig,
  NestedRouteConfig,
  TypedRoute,
  CompatibleRoute,
} from "./route";
export { createTypedRoute, isTypedRoute } from "./route";

// 组件路由和 Schema 类型
export * from "./component-route";
export * from "./schema";
