/**
 * 路由工具函数
 *
 * 提供路由处理的基础工具
 */

import type { Route, NestedRoute, FlattenedRoute, Middleware } from "./types";

/**
 * 扁平化嵌套路由
 *
 * 将嵌套路由结构转换为扁平数组，计算完整路径和中间件链
 *
 * @example
 * ```typescript
 * const routes = flattenNestedRoutes([
 *   {
 *     path: "/api",
 *     middleware: [authMiddleware],
 *     children: [
 *       { path: "/users", method: "GET", handler: getUsers },
 *       { path: "/users/:id", method: "GET", handler: getUser },
 *     ],
 *   },
 * ]);
 * // 结果:
 * // [
 * //   { fullPath: "/api/users", method: "GET", ... },
 * //   { fullPath: "/api/users/:id", method: "GET", ... },
 * // ]
 * ```
 */
export function flattenNestedRoutes(
  routes: (Route | NestedRoute)[],
): FlattenedRoute[] {
  const flattened: FlattenedRoute[] = [];

  function processRoute(
    route: Route | NestedRoute,
    parentPath = "",
    parentMiddleware: Middleware[] = [],
  ): void {
    // 计算当前完整路径
    const currentPath = normalizePath(parentPath + route.path);
    // 合并中间件链
    const currentMiddleware = [
      ...parentMiddleware,
      ...(route.middleware || []),
    ];

    if ("method" in route && "handler" in route) {
      // 叶子路由（有处理函数）
      flattened.push({
        ...route,
        fullPath: currentPath,
        middlewareChain: currentMiddleware,
      });
    } else if ("children" in route && route.children) {
      // 分组路由，递归处理子路由
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
 * 标准化路径
 *
 * - 解码 URL 编码字符
 * - 去除重复斜杠
 * - 处理结尾斜杠
 *
 * @example
 * ```typescript
 * normalizePath("//api//users/")  // "/api/users"
 * normalizePath("/api/%20test")   // "/api/ test"
 * ```
 */
export function normalizePath(path: string): string {
  // 解码 URL 编码
  let normalized = decodeURIComponent(path);

  // 去除重复斜杠
  normalized = normalized.replace(/\/+/g, "/");

  // 空路径转为根路径
  if (normalized === "") return "/";

  // 去除结尾斜杠（根路径除外）
  if (normalized !== "/" && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}
