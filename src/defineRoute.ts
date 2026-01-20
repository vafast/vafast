/**
 * 路由定义 - Schema 在路由级别定义，支持嵌套路由和中间件类型推断
 *
 * @example
 * ```typescript
 * // 定义带类型的中间件（函数式风格，通过 next 传递上下文）
 * const authMiddleware = defineMiddleware<{ user: User }>((req, next) => {
 *   const user = getUser(req)
 *   return next({ user })  // 通过 next 参数传递上下文
 * })
 *
 * // 路由自动推断中间件注入的类型
 * const routes = defineRoutes([
 *   defineRoute({
 *     path: '/api',
 *     middleware: [authMiddleware],
 *     children: [
 *       defineRoute({
 *         method: 'GET',
 *         path: '/profile',
 *         handler: ({ user }) => ({ name: user.name })  // ✅ user 有类型
 *       })
 *     ]
 *   })
 * ])
 * ```
 */

import type { TSchema, Static } from "@sinclair/typebox";
import { parseBody, parseQuery, parseHeaders, parseCookies } from "./utils/parsers";
import { validateAllSchemas, precompileSchemas } from "./utils/validators/validators";
import { json } from "./utils/response";
import { VafastError } from "./middleware";

// ============= Schema 类型 =============

/** 路由 Schema 配置 */
export interface RouteSchema {
  body?: TSchema;
  query?: TSchema;
  params?: TSchema;
  headers?: TSchema;
  cookies?: TSchema;
  /** 响应类型 schema（用于类型同步，运行时不做校验） */
  response?: TSchema;
}

/** 从 Schema 推断类型 */
type InferSchemaType<T extends RouteSchema> = {
  body: T["body"] extends TSchema ? Static<T["body"]> : unknown;
  query: T["query"] extends TSchema ? Static<T["query"]> : Record<string, string>;
  params: T["params"] extends TSchema ? Static<T["params"]> : Record<string, string>;
  headers: T["headers"] extends TSchema ? Static<T["headers"]> : Record<string, string>;
  cookies: T["cookies"] extends TSchema ? Static<T["cookies"]> : Record<string, string>;
};

// ============= 中间件类型系统 =============

/** 带类型标记的中间件 */
export interface TypedMiddleware<TContext extends object = object> {
  (req: Request, next: (ctx?: TContext) => Promise<Response>): Response | Promise<Response>;
  /** 类型标记（仅编译时使用） */
  __context?: TContext;
}

/** 普通中间件（无类型注入） */
type PlainMiddleware = (req: Request, next: () => Promise<Response>) => Response | Promise<Response>;

/** 任意中间件类型 */
type AnyMiddleware = TypedMiddleware<object> | PlainMiddleware;

/** 从中间件提取上下文类型 */
type ExtractMiddlewareContext<T> = T extends TypedMiddleware<infer C> ? C : object;

/** 合并中间件数组的上下文类型 */
type MergeMiddlewareContexts<T extends readonly unknown[]> =
  T extends readonly [infer First, ...infer Rest]
  ? ExtractMiddlewareContext<First> & MergeMiddlewareContexts<Rest>
  : object;

// ============= Handler 上下文 =============

/** Handler 上下文（包含 schema 推断） */
export interface HandlerContext<TSchema extends RouteSchema = RouteSchema> {
  req: Request;
  body: InferSchemaType<TSchema>["body"];
  query: InferSchemaType<TSchema>["query"];
  params: InferSchemaType<TSchema>["params"];
  headers: InferSchemaType<TSchema>["headers"];
  cookies: InferSchemaType<TSchema>["cookies"];
}

/** Handler 上下文（带中间件注入的额外类型） */
type HandlerContextWithExtra<TSchema extends RouteSchema, TExtra> =
  HandlerContext<TSchema> & TExtra;

// ============= 路由配置类型 =============

/** HTTP 方法 */
type HTTPMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS" | "HEAD";

/** 叶子路由配置（有 method 和 handler） */
export interface LeafRouteConfig<
  TMethod extends HTTPMethod = HTTPMethod,
  TPath extends string = string,
  TSchema extends RouteSchema = RouteSchema,
  TReturn = unknown,
  TMiddleware extends readonly AnyMiddleware[] = readonly AnyMiddleware[]
> {
  readonly method: TMethod;
  readonly path: TPath;
  readonly name?: string;
  readonly description?: string;
  readonly schema?: TSchema;
  readonly handler: (
    ctx: HandlerContextWithExtra<TSchema, MergeMiddlewareContexts<TMiddleware>>
  ) => TReturn | Promise<TReturn>;
  readonly middleware?: TMiddleware;
  readonly docs?: {
    tags?: string[];
    security?: unknown[];
    responses?: Record<string, unknown>;
  };
}

/** 嵌套路由配置（有 children，无 method 和 handler） */
export interface NestedRouteConfig<
  TPath extends string = string,
  TMiddleware extends readonly AnyMiddleware[] = readonly AnyMiddleware[]
> {
  readonly path: TPath;
  readonly name?: string;
  readonly description?: string;
  readonly middleware?: TMiddleware;
  readonly children: ReadonlyArray<RouteConfigResult>;
}

/** defineRoute 返回的类型 */
type RouteConfigResult =
  | LeafRouteConfig<HTTPMethod, string, RouteSchema, unknown, readonly AnyMiddleware[]>
  | NestedRouteConfig<string, readonly AnyMiddleware[]>;

/** 处理后的扁平路由 */
export interface ProcessedRoute {
  method: HTTPMethod;
  path: string;
  name?: string;
  description?: string;
  schema?: RouteSchema;
  handler: (req: Request) => Promise<Response>;
  middleware?: readonly AnyMiddleware[];
  docs?: {
    tags?: string[];
    security?: unknown[];
    responses?: Record<string, unknown>;
  };
  /** 允许任意扩展（兼容 Route 类型） */
  [key: string]: unknown;
}

// ============= defineMiddleware =============

/**
 * 定义带类型的中间件（函数式风格）
 *
 * 通过 next() 参数传递上下文，更符合函数式编程风格
 *
 * @example
 * ```typescript
 * type AuthContext = { user: { id: string; name: string } }
 *
 * const authMiddleware = defineMiddleware<AuthContext>((req, next) => {
 *   const user = getUserFromToken(req)
 *   return next({ user })  // 通过 next 传递上下文
 * })
 * ```
 */
export function defineMiddleware<TContext extends object = object>(
  handler: (
    req: Request,
    next: (ctx?: TContext) => Promise<Response>
  ) => Promise<Response>
): TypedMiddleware<TContext> {
  // 包装成标准中间件签名
  const middleware = ((req: Request, originalNext: () => Promise<Response>) => {
    // 包装 next，接收上下文参数并存储到 req.__locals
    const nextWithContext = (ctx?: TContext): Promise<Response> => {
      if (ctx) {
        const target = req as unknown as { __locals?: object };
        target.__locals = { ...(target.__locals || {}), ...ctx };
      }
      return originalNext();
    };
    return handler(req, nextWithContext);
  }) as TypedMiddleware<TContext>;

  return middleware;
}

// ============= 响应处理 =============

/** 自动转换返回值为 Response */
function autoResponse(result: unknown): Response {
  if (result instanceof Response) return result;
  if (result === null || result === undefined) return new Response(null, { status: 204 });
  if (typeof result === "string") {
    return new Response(result, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
  if (typeof result === "number" || typeof result === "boolean") {
    return new Response(String(result), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
  if (typeof result === "object") {
    const obj = result as Record<string, unknown>;
    if ("data" in obj && ("status" in obj || "headers" in obj)) {
      const { data, status = 200, headers = {} } = obj;
      if (data === null || data === undefined) {
        return new Response(null, { status: status === 200 ? 204 : (status as number), headers: headers as HeadersInit });
      }
      return json(data, status as number, headers as Record<string, string>);
    }
    return json(result);
  }
  return new Response(null, { status: 204 });
}

/** 创建包装后的 handler */
function wrapHandler<TSchema extends RouteSchema>(
  schema: TSchema | undefined,
  userHandler: (ctx: HandlerContext<TSchema>) => unknown | Promise<unknown>
): (req: Request) => Promise<Response> {
  if (schema && (schema.body || schema.query || schema.params || schema.headers || schema.cookies)) {
    precompileSchemas(schema);
  }

  return async (req: Request): Promise<Response> => {
    try {
      const query = parseQuery(req);
      const headers = parseHeaders(req);
      const cookies = parseCookies(req);
      const params = ((req as unknown as Record<string, unknown>).params as Record<string, string>) || {};

      let body: unknown = undefined;
      if (req.method !== "GET" && req.method !== "HEAD") {
        try {
          body = await parseBody(req);
        } catch {
          // 忽略解析错误
        }
      }

      const data = { body, query, params, headers, cookies };
      if (schema && (schema.body || schema.query || schema.params || schema.headers || schema.cookies)) {
        validateAllSchemas(schema, data);
      }

      // 获取中间件注入的上下文
      const extraCtx = (req as unknown as { __locals?: unknown }).__locals || {};

      const result = await userHandler({
        req,
        body: body as HandlerContext<TSchema>["body"],
        query: query as HandlerContext<TSchema>["query"],
        params: params as HandlerContext<TSchema>["params"],
        headers: headers as HandlerContext<TSchema>["headers"],
        cookies: cookies as HandlerContext<TSchema>["cookies"],
        ...extraCtx,
      } as HandlerContext<TSchema>);

      return autoResponse(result);
    } catch (error) {
      // 如果是 VafastError，重新抛出让错误处理中间件处理
      if (error instanceof VafastError) {
        throw error;
      }
      if (error instanceof Error && error.message.includes("验证失败")) {
        return json({ code: 400, message: error.message }, 400);
      }
      return json({ code: 500, message: error instanceof Error ? error.message : "未知错误" }, 500);
    }
  };
}

// ============= 判断路由类型 =============

/** 判断是否为叶子路由 */
function isLeafRoute(route: RouteConfigResult): route is LeafRouteConfig {
  return "method" in route && "handler" in route;
}

/** 判断是否为嵌套路由 */
function isNestedRoute(route: RouteConfigResult): route is NestedRouteConfig {
  return "children" in route;
}

// ============= defineRoute 函数（支持重载） =============

/**
 * 定义叶子路由（有 method 和 handler），支持中间件类型推断和显式上下文类型
 *
 * @example
 * ```typescript
 * // 方式1：通过中间件自动推断上下文
 * defineRoute({
 *   method: 'GET',
 *   path: '/profile',
 *   middleware: [authMiddleware],
 *   handler: ({ user }) => { ... }  // user 来自 authMiddleware
 * })
 *
 * // 方式2：显式声明上下文类型（用于父级中间件注入的场景）
 * defineRoute({
 *   method: 'GET',
 *   path: '/profile',
 *   context: {} as { userInfo: UserInfo },
 *   handler: ({ userInfo }) => { ... }  // userInfo 有类型
 * })
 * ```
 */
export function defineRoute<
  const TSchema extends RouteSchema,
  TReturn,
  const TMiddleware extends readonly AnyMiddleware[],
  TContext extends object = object,
  TMethod extends HTTPMethod = HTTPMethod,
  TPath extends string = string
>(config: {
  readonly method: TMethod;
  readonly path: TPath;
  readonly name?: string;
  readonly description?: string;
  readonly schema?: TSchema;
  /** 显式声明上下文类型（用于父级中间件注入的场景） */
  readonly context?: TContext;
  readonly handler: (
    ctx: HandlerContextWithExtra<TSchema, TContext & MergeMiddlewareContexts<TMiddleware>>
  ) => TReturn | Promise<TReturn>;
  readonly middleware?: TMiddleware;
  readonly docs?: {
    tags?: string[];
    security?: unknown[];
    responses?: Record<string, unknown>;
  };
}): LeafRouteConfig<TMethod, TPath, TSchema, TReturn, TMiddleware>;

/**
 * 定义嵌套路由（有 children），支持中间件类型推断
 */
export function defineRoute<
  const TMiddleware extends readonly AnyMiddleware[],
  TPath extends string = string
>(config: {
  readonly path: TPath;
  readonly name?: string;
  readonly description?: string;
  readonly middleware?: TMiddleware;
  readonly children: ReadonlyArray<RouteConfigResult>;
}): NestedRouteConfig<TPath, TMiddleware>;

/**
 * defineRoute 实现
 */
export function defineRoute(config: {
  readonly method?: HTTPMethod;
  readonly path: string;
  readonly name?: string;
  readonly description?: string;
  readonly schema?: RouteSchema;
  readonly context?: object;
  readonly handler?: (ctx: HandlerContext<RouteSchema>) => unknown | Promise<unknown>;
  readonly middleware?: readonly AnyMiddleware[];
  readonly children?: ReadonlyArray<RouteConfigResult>;
  readonly docs?: {
    tags?: string[];
    security?: unknown[];
    responses?: Record<string, unknown>;
  };
}): RouteConfigResult {
  return config as RouteConfigResult;
}

// ============= withContext 工厂函数 =============

/**
 * 创建带预设上下文类型的路由定义器
 *
 * 用于父级中间件注入上下文的场景，定义一次，多处复用
 *
 * @example
 * ```typescript
 * // 1. 在 middleware/index.ts 中定义
 * export const defineAuthRoute = withContext<{ userInfo: UserInfo }>()
 *
 * // 2. 在路由文件中使用
 * defineAuthRoute({
 *   method: 'GET',
 *   path: '/profile',
 *   handler: ({ userInfo }) => {
 *     // userInfo 自动有类型！
 *     return { id: userInfo.id }
 *   }
 * })
 * ```
 */
/**
 * 带扩展类型的路由定义器
 *
 * @typeParam TContext - Handler 上下文类型（如 { userInfo: UserInfo }）
 * @typeParam TExtensions - 路由扩展字段类型（如 { webhook?: boolean }）
 *
 * @example
 * ```typescript
 * // 定义扩展类型
 * interface WebhookExtension {
 *   webhook?: boolean | { eventKey?: string }
 * }
 *
 * // 使用扩展
 * const defineRoute = withContext<MyContext, WebhookExtension>()
 * defineRoute({
 *   method: 'POST',
 *   path: '/create',
 *   webhook: true,  // TypeScript 严格检查
 *   handler: ...
 * })
 * ```
 */
export function withContext<
  TContext extends object,
  TExtensions extends object = object
>() {
  return <
    const TSchema extends RouteSchema,
    TReturn,
    const TMiddleware extends readonly AnyMiddleware[],
    TMethod extends HTTPMethod = HTTPMethod,
    TPath extends string = string
  >(config: {
    readonly method: TMethod;
    readonly path: TPath;
    readonly name?: string;
    readonly description?: string;
    readonly schema?: TSchema;
    readonly handler: (
      ctx: HandlerContextWithExtra<TSchema, TContext & MergeMiddlewareContexts<TMiddleware>>
    ) => TReturn | Promise<TReturn>;
    readonly middleware?: TMiddleware;
    readonly docs?: {
      tags?: string[];
      security?: unknown[];
      responses?: Record<string, unknown>;
    };
  } & TExtensions): LeafRouteConfig<TMethod, TPath, TSchema, TReturn, TMiddleware> => {
    return config as unknown as LeafRouteConfig<TMethod, TPath, TSchema, TReturn, TMiddleware>;
  };
}

// ============= 扁平化嵌套路由 =============

/** 父级路由信息 */
interface ParentRouteInfo {
  /** 父级路由路径 */
  path: string;
  /** 父级路由名称 */
  name?: string;
  /** 父级路由描述 */
  description?: string;
}

/**
 * 递归扁平化路由，合并路径和中间件
 */
function flattenRoutes(
  routes: ReadonlyArray<RouteConfigResult>,
  parentPath: string = "",
  parentMiddleware: readonly AnyMiddleware[] = [],
  parent?: ParentRouteInfo
): ProcessedRoute[] {
  const result: ProcessedRoute[] = [];

  for (const route of routes) {
    const fullPath = parentPath + route.path;
    const mergedMiddleware = [...parentMiddleware, ...(route.middleware || [])];

    if (isLeafRoute(route)) {
      // 基础属性
      const processed: ProcessedRoute = {
        method: route.method,
        path: fullPath,
        name: route.name,
        description: route.description,
        schema: route.schema,
        handler: wrapHandler(route.schema, route.handler as (ctx: HandlerContext<RouteSchema>) => unknown),
        middleware: mergedMiddleware.length > 0 ? mergedMiddleware : undefined,
        docs: route.docs,
      };
      // 添加父级路由信息
      if (parent) {
        processed.parent = parent;
      }
      // 复制扩展属性（如 webhook, permission 等）
      const knownKeys = ['method', 'path', 'name', 'description', 'schema', 'handler', 'middleware', 'docs'];
      for (const key of Object.keys(route)) {
        if (!knownKeys.includes(key)) {
          processed[key] = (route as unknown as Record<string, unknown>)[key];
        }
      }
      result.push(processed);
    } else if (isNestedRoute(route)) {
      // 传递当前路由信息作为子路由的 parent
      const currentParent: ParentRouteInfo = {
        path: fullPath,
        name: route.name,
        description: route.description,
      };
      result.push(...flattenRoutes(route.children, fullPath, mergedMiddleware, currentParent));
    }
  }

  return result;
}

// ============= defineRoutes 函数 =============

/** 带原始类型信息的路由数组 */
export type RoutesWithSource<T extends readonly RouteConfigResult[]> = ProcessedRoute[] & { __source: T };

/**
 * 定义路由数组，支持嵌套路由
 *
 * 使用 `const T` 泛型自动保留字面量类型，无需手动添加 `as const`
 *
 * @example
 * ```typescript
 * const routes = defineRoutes([
 *   defineRoute({ method: 'GET', path: '/users', handler: ... }),
 *   defineRoute({ method: 'POST', path: '/users', handler: ... }),
 * ])
 *
 * // 类型推断自动工作，无需 as const
 * type Api = InferEden<typeof routes>
 * ```
 */
export function defineRoutes<const T extends readonly RouteConfigResult[]>(
  routes: T
): RoutesWithSource<T> {
  const processed = flattenRoutes(routes);
  // 附加原始类型信息（仅用于类型推断，运行时不使用）
  return Object.assign(processed, { __source: routes }) as RoutesWithSource<T>;
}

// ============= 用于 API Client 的类型推断 =============

/** 可推断的路由类型（供 vafast-api-client 使用） */
export type InferableRoute<
  TMethod extends string = string,
  TPath extends string = string,
  TReturn = unknown,
  TSchema extends RouteSchema = RouteSchema
> = {
  readonly method: TMethod;
  readonly path: TPath;
  readonly name?: string;
  readonly description?: string;
  readonly schema?: TSchema;
  readonly handler: {
    __returnType: TReturn;
    __schema: TSchema;
  };
  readonly middleware?: ReadonlyArray<AnyMiddleware>;
};
