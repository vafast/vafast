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
/** 标准路由属性（不继承） */
const STANDARD_ROUTE_PROPS = new Set([
  'path', 'method', 'handler', 'middleware', 'children', 'name', 'description',
]);

/**
 * 提取路由的自定义属性（用于继承）
 * 排除标准属性，保留 log, webhook, auth 等自定义配置
 */
function extractCustomProps(route: Route | NestedRoute): Record<string, unknown> {
  const custom: Record<string, unknown> = {};
  for (const key of Object.keys(route)) {
    if (!STANDARD_ROUTE_PROPS.has(key)) {
      custom[key] = (route as Record<string, unknown>)[key];
    }
  }
  return custom;
}

/**
 * 合并自定义属性（子路由覆盖父路由）
 */
function mergeCustomProps(
  parentProps: Record<string, unknown>,
  childProps: Record<string, unknown>,
): Record<string, unknown> {
  return { ...parentProps, ...childProps };
}

export function flattenNestedRoutes(
  routes: (Route | NestedRoute)[],
): FlattenedRoute[] {
  const flattened: FlattenedRoute[] = [];

  function processRoute(
    route: Route | NestedRoute,
    parentPath = "",
    parentMiddleware: Middleware[] = [],
    parentName?: string,
    parentCustomProps: Record<string, unknown> = {},
  ): void {
    // 计算当前完整路径
    const currentPath = normalizePath(parentPath + route.path);
    // 合并中间件链
    const currentMiddleware = [
      ...parentMiddleware,
      ...(route.middleware || []),
    ];
    // 当前路由的 name（用于传递给子路由）
    const currentName = route.name || parentName;
    // 合并自定义属性（子路由可覆盖父路由设置）
    const currentCustomProps = mergeCustomProps(parentCustomProps, extractCustomProps(route));

    if ("method" in route && "handler" in route) {
      // 叶子路由（有处理函数）
      const leafRoute = route as Route;
      flattened.push({
        ...currentCustomProps, // 继承的自定义属性放在前面
        ...leafRoute,          // 叶子路由自身属性覆盖
        fullPath: currentPath,
        middlewareChain: currentMiddleware,
        parentName: parentName,
      });
    } else if ("children" in route && route.children) {
      // 分组路由，递归处理子路由
      for (const child of route.children) {
        processRoute(child, currentPath, currentMiddleware, currentName, currentCustomProps);
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
