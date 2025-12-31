/**
 * Schema 类型定义
 *
 * 使用 TSchema 约束替代 any，提供完整的类型安全
 *
 * @author Framework Team
 * @version 1.0.0
 * @license MIT
 */

import type { TSchema, Static } from "@sinclair/typebox";

/**
 * 路由 Schema 配置
 * 所有 schema 字段使用 TSchema 约束
 */
export interface RouteSchema {
  body?: TSchema;
  query?: TSchema;
  params?: TSchema;
  headers?: TSchema;
  cookies?: TSchema;
}

/**
 * 从 Schema 配置推导出具体类型
 */
export type InferSchema<T extends RouteSchema> = {
  body: T["body"] extends TSchema ? Static<T["body"]> : unknown;
  query: T["query"] extends TSchema
    ? Static<T["query"]>
    : Record<string, string>;
  params: T["params"] extends TSchema
    ? Static<T["params"]>
    : Record<string, string>;
  headers: T["headers"] extends TSchema
    ? Static<T["headers"]>
    : Record<string, string>;
  cookies: T["cookies"] extends TSchema
    ? Static<T["cookies"]>
    : Record<string, string>;
};

/**
 * Handler 上下文类型
 */
export interface HandlerContext<T extends RouteSchema = RouteSchema> {
  /** 原始请求对象 */
  req: Request;
  /** 请求体 (经过 schema 验证) */
  body: InferSchema<T>["body"];
  /** 查询参数 (经过 schema 验证) */
  query: InferSchema<T>["query"];
  /** 路径参数 (经过 schema 验证) */
  params: InferSchema<T>["params"];
  /** 请求头 (经过 schema 验证) */
  headers: InferSchema<T>["headers"];
  /** Cookie (经过 schema 验证) */
  cookies: InferSchema<T>["cookies"];
}

/**
 * 带额外上下文的 Handler 上下文类型
 * 用于中间件注入额外数据
 */
export type HandlerContextWithExtra<
  T extends RouteSchema = RouteSchema,
  TExtra extends Record<string, unknown> = Record<string, never>,
> = HandlerContext<T> & TExtra;

/**
 * Handler 函数类型
 */
export type TypedHandler<
  T extends RouteSchema = RouteSchema,
  TExtra extends Record<string, unknown> = Record<string, never>,
  TReturn = unknown,
> = (ctx: HandlerContextWithExtra<T, TExtra>) => TReturn | Promise<TReturn>;

/**
 * 扩展的路由配置 (包含 schema)
 */
export interface TypedRouteConfig<T extends RouteSchema = RouteSchema> {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS" | "HEAD";
  path: string;
  schema?: T;
  handler: (req: Request) => Response | Promise<Response>;
  middleware?: Array<
    (req: Request, next: () => Promise<Response>) => Promise<Response>
  >;
  docs?: {
    description?: string;
    tags?: string[];
    security?: unknown[];
    responses?: Record<string, unknown>;
  };
  timeout?: number;
  maxBodySize?: string;
}
