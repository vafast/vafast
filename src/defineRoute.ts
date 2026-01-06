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
 * 定义路由数组（保留完整类型信息）
 * 
 * 使用 `const` 泛型参数确保字面量类型被保留。
 * 用户应配合 `as const` 使用以获得最佳类型推断。
 * 
 * @example
 * ```typescript
 * import { defineRoutes, createHandler } from 'vafast'
 * import { Type } from '@sinclair/typebox'
 * 
 * const routes = defineRoutes([
 *   {
 *     method: 'GET',
 *     path: '/users',
 *     handler: createHandler(
 *       { query: Type.Object({ page: Type.Number() }) },
 *       async ({ query }) => ({ users: [], total: 0 })
 *     )
 *   }
 * ] as const)
 * 
 * // 类型会被完整保留：
 * // - method: 'GET' (字面量)
 * // - path: '/users' (字面量)  
 * // - handler 的返回类型和 schema 类型
 * 
 * // 导出供客户端使用
 * export type AppRoutes = typeof routes
 * ```
 */
export function defineRoutes<
  const T extends readonly {
    readonly method: string
    readonly path: string
    readonly handler: unknown
    readonly middleware?: ReadonlyArray<(req: Request, next: () => Promise<Response>) => Promise<Response>>
  }[]
>(routes: T): T {
  return routes;
}
