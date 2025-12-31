import type {
  ComponentRoute,
  NestedComponentRoute,
  FlattenedComponentRoute,
} from "../types/component-route";
import { vueRenderer, reactRenderer } from "./component-renderer";

/**
 * 扁平化嵌套组件路由
 */
export function flattenComponentRoutes(
  routes: (ComponentRoute | NestedComponentRoute)[],
): FlattenedComponentRoute[] {
  const flattened: FlattenedComponentRoute[] = [];

  function processRoute(
    route: ComponentRoute | NestedComponentRoute,
    parentPath: string = "",
    parentMiddleware: any[] = [],
  ) {
    const currentPath = parentPath + route.path;
    const currentMiddleware = [
      ...parentMiddleware,
      ...(route.middleware || []),
    ];

    if ("component" in route) {
      // 这是一个组件路由
      flattened.push({
        ...route,
        fullPath: currentPath,
        middlewareChain: currentMiddleware,
      });
    } else if ("children" in route && route.children) {
      // 这是一个嵌套路由
      for (const child of route.children) {
        processRoute(child, currentPath, currentMiddleware);
      }
    }
  }

  for (const route of routes) {
    processRoute(route);
  }

  return flattened;
}

/**
 * 组件路由处理器中间件
 * 自动检测组件类型并应用相应的渲染器
 */
export const componentRouter = () => {
  return async (req: Request, next: () => Promise<Response>) => {
    // 这里可以添加组件路由的自动处理逻辑
    // 比如自动检测组件类型，应用相应的渲染器
    return next();
  };
};
