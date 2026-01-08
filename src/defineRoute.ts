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
 * 定义路由数组（自动保留字面量类型，支持端到端类型推断）
 *
 * @example
 * ```typescript
 * import { defineRoutes, createHandler, Type } from 'vafast'
 * import type { InferEden } from 'vafast-api-client'
 *
 * const routes = defineRoutes([
 *   {
 *     method: 'GET',
 *     path: '/users',
 *     handler: createHandler(
 *       { query: Type.Object({ page: Type.Number() }) },
 *       async ({ query }) => ({ users: [], total: 0 })
 *     )
 *   },
 *   {
 *     method: 'POST',
 *     path: '/users',
 *     handler: createHandler(
 *       { body: Type.Object({ name: Type.String() }) },
 *       async ({ body }) => ({ id: '1', name: body.name })
 *     )
 *   }
 * ])
 *
 * // ✅ 自动推断字面量类型，支持端到端类型推断
 * type Api = InferEden<typeof routes>
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
