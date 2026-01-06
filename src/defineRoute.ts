import type { RouteSchema } from "./types";
import type { InferableHandler } from "./utils/create-handler";

/**
 * 可推断的路由类型（用于类型推断）
 * 供 vafast-api-client 使用，保留完整的类型信息
 */
export type InferableRoute<
  TMethod extends string = string,
  TPath extends string = string,
  TReturn = unknown,
  TSchema extends RouteSchema = RouteSchema
> = {
  readonly method: TMethod;
  readonly path: TPath;
  readonly handler: InferableHandler<TReturn, TSchema>;
  readonly middleware?: ReadonlyArray<(req: Request, next: () => Promise<Response>) => Promise<Response>>;
}

/**
 * 中间件类型
 */
type Middleware = (req: Request, next: () => Promise<Response>) => Promise<Response>;

/**
 * 路由定义类型（保留完整 handler 类型）
 */
export type RouteDefinition<
  TMethod extends string = string,
  TPath extends string = string,
  THandler = unknown
> = {
  readonly method: TMethod;
  readonly path: TPath;
  readonly handler: THandler;
  readonly middleware?: ReadonlyArray<Middleware>;
}

/**
 * 创建单个路由定义（自动保留字面量类型，无需 as const）
 * 
 * @example
 * ```typescript
 * import { route, defineRoutes, createHandler, Type } from 'vafast'
 * 
 * const routes = defineRoutes([
 *   route('GET', '/users', createHandler(
 *     { query: Type.Object({ page: Type.Number() }) },
 *     async ({ query }) => ({ users: [], total: 0 })
 *   )),
 *   route('POST', '/users', createHandler(
 *     { body: Type.Object({ name: Type.String() }) },
 *     async ({ body }) => ({ id: '1', name: body.name })
 *   )),
 *   route('GET', '/users/:id', createHandler(
 *     { params: Type.Object({ id: Type.String() }) },
 *     async ({ params }) => ({ id: params.id, name: 'User' })
 *   ))
 * ])
 * 
 * // 无需 as const！类型自动推断
 * type Api = InferEden<typeof routes>
 * ```
 */
export function route<
  TMethod extends string,
  TPath extends string,
  THandler
>(
  method: TMethod,
  path: TPath,
  handler: THandler,
  middleware?: Middleware[]
): RouteDefinition<TMethod, TPath, THandler> {
  return {
    method,
    path,
    handler,
    middleware
  };
}

/**
 * GET 路由快捷方法
 */
export function get<TPath extends string, THandler>(
  path: TPath,
  handler: THandler,
  middleware?: Middleware[]
): RouteDefinition<'GET', TPath, THandler> {
  return route('GET', path, handler, middleware);
}

/**
 * POST 路由快捷方法
 */
export function post<TPath extends string, THandler>(
  path: TPath,
  handler: THandler,
  middleware?: Middleware[]
): RouteDefinition<'POST', TPath, THandler> {
  return route('POST', path, handler, middleware);
}

/**
 * PUT 路由快捷方法
 */
export function put<TPath extends string, THandler>(
  path: TPath,
  handler: THandler,
  middleware?: Middleware[]
): RouteDefinition<'PUT', TPath, THandler> {
  return route('PUT', path, handler, middleware);
}

/**
 * DELETE 路由快捷方法
 */
export function del<TPath extends string, THandler>(
  path: TPath,
  handler: THandler,
  middleware?: Middleware[]
): RouteDefinition<'DELETE', TPath, THandler> {
  return route('DELETE', path, handler, middleware);
}

/**
 * PATCH 路由快捷方法
 */
export function patch<TPath extends string, THandler>(
  path: TPath,
  handler: THandler,
  middleware?: Middleware[]
): RouteDefinition<'PATCH', TPath, THandler> {
  return route('PATCH', path, handler, middleware);
}

/**
 * 定义路由数组（保留完整类型信息）
 * 
 * 推荐配合 route() 函数使用，无需 as const
 * 
 * @example
 * ```typescript
 * import { defineRoutes, route, createHandler, Type } from 'vafast'
 * 
 * // ✨ 新方式：使用 route() 函数，无需 as const
 * const routes = defineRoutes([
 *   route('GET', '/users', createHandler(...)),
 *   route('POST', '/users', createHandler(...))
 * ])
 * 
 * // 🔙 旧方式：需要 as const（仍然支持）
 * const routes = defineRoutes([
 *   { method: 'GET', path: '/users', handler: createHandler(...) }
 * ] as const)
 * ```
 */
export function defineRoutes<
  const T extends readonly {
    readonly method: string
    readonly path: string
    readonly handler: unknown
    readonly middleware?: ReadonlyArray<Middleware>
  }[]
>(routes: T): T {
  return routes;
}
