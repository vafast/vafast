/**
 * Server-Sent Events (SSE) 支持
 *
 * 用于实现流式响应，如 AI 聊天、实时通知等
 *
 * @example
 * ```typescript
 * import { createSSEHandler, Type } from 'vafast'
 *
 * const streamHandler = createSSEHandler(
 *   { query: Type.Object({ prompt: Type.String() }) },
 *   async function* ({ query }) {
 *     yield { event: 'start', data: { message: 'Starting...' } }
 *
 *     for await (const chunk of aiStream(query.prompt)) {
 *       yield { data: chunk }
 *     }
 *
 *     yield { event: 'end', data: { message: 'Done!' } }
 *   }
 * )
 * ```
 */

import type { RouteSchema, HandlerContext } from "../defineRoute";
import { parseQuery, parseHeaders, parseCookies } from "./parsers";
import { precompileSchemas, validateAllSchemas } from "./validators/validators";

/**
 * SSE 事件类型
 */
export interface SSEEvent<T = unknown> {
  /** 事件名称（可选，默认为 message） */
  event?: string;
  /** 事件数据 */
  data: T;
  /** 事件 ID（可选） */
  id?: string;
  /** 重试间隔（毫秒，可选） */
  retry?: number;
}

/**
 * SSE 生成器函数类型
 */
export type SSEGenerator<T extends RouteSchema = RouteSchema> = (
  ctx: HandlerContext<T>
) => AsyncGenerator<SSEEvent<unknown>, void, unknown>;

/**
 * 格式化 SSE 事件为字符串
 */
function formatSSEEvent(event: SSEEvent): string {
  const lines: string[] = [];

  if (event.id !== undefined) {
    lines.push(`id: ${event.id}`);
  }

  if (event.event !== undefined) {
    lines.push(`event: ${event.event}`);
  }

  if (event.retry !== undefined) {
    lines.push(`retry: ${event.retry}`);
  }

  // 数据可能是多行的，需要分行处理
  const dataStr = typeof event.data === 'string'
    ? event.data
    : JSON.stringify(event.data);

  const dataLines = dataStr.split('\n');
  for (const line of dataLines) {
    lines.push(`data: ${line}`);
  }

  return lines.join('\n') + '\n\n';
}

/**
 * SSE 标记类型 - 使用字面量品牌类型
 */
export type SSEMarker = { readonly __brand: 'SSE' }

/**
 * SSE Handler 基础类型（对外暴露，类型简单）
 * 支持两种调用方式：
 * 1. route('GET', '/path', handler) - 传入 Request
 * 2. defineRoute({ handler }) - 传入 HandlerContext
 */
export interface SSEHandler {
  (reqOrCtx: Request | HandlerContext<RouteSchema>): Promise<Response>;
  /** 返回类型标记 - SSE 流的数据类型 */
  readonly __returnType?: unknown;
  /** SSE 标记 - 使用品牌类型确保不被扩展 */
  readonly __sse?: SSEMarker;
}

/**
 * SSE Handler 内部类型（带泛型，仅内部使用）
 */
interface SSEHandlerInternal<TSchema extends RouteSchema = RouteSchema> {
  (reqOrCtx: Request | HandlerContext<TSchema>): Promise<Response>;
  readonly __returnType?: unknown;
  readonly __sse?: SSEMarker;
}

/**
 * 创建 SSE 流式响应处理器
 *
 * 支持两种使用方式：
 *
 * @example
 * ```typescript
 * const streamHandler = createSSEHandler(
 *   { params: Type.Object({ id: Type.String() }) },
 *   async function* ({ params }) {
 *     yield { data: { status: 'started' } };
 *     // ... 业务逻辑
 *     yield { data: { status: 'done' } };
 *   }
 * );
 *
 * // 方式 1: 低层 API（route 函数）
 * route('GET', '/stream/:id', streamHandler)
 *
 * // 方式 2: 高层 API（defineRoute 函数）✅ 现在也支持
 * defineRoute({
 *   method: 'GET',
 *   path: '/stream/:id',
 *   handler: streamHandler,
 * })
 * ```
 */
export function createSSEHandler<const T extends RouteSchema>(
  schema: T,
  generator: SSEGenerator<T>
): SSEHandler;

export function createSSEHandler(
  generator: SSEGenerator<RouteSchema>
): SSEHandler;

export function createSSEHandler<const T extends RouteSchema>(
  schemaOrGenerator: T | SSEGenerator<T>,
  maybeGenerator?: SSEGenerator<T>
): SSEHandler {
  // 判断调用方式
  const hasSchema = typeof schemaOrGenerator !== 'function';
  const schema = hasSchema ? (schemaOrGenerator as T) : ({} as T);
  const generator = hasSchema
    ? maybeGenerator!
    : (schemaOrGenerator as SSEGenerator<T>);

  // 预编译 schema
  if (schema.body || schema.query || schema.params || schema.headers || schema.cookies) {
    precompileSchemas(schema);
  }

  /**
   * 检测是否是 HandlerContext（来自 defineRoute）
   * HandlerContext 有 req 属性，而 Request 没有
   */
  const isHandlerContext = (arg: unknown): arg is HandlerContext<T> => {
    return arg !== null &&
      typeof arg === 'object' &&
      'req' in arg &&
      'params' in arg;
  };

  const handlerFn = async (reqOrCtx: Request | HandlerContext<T>): Promise<Response> => {
    try {
      let req: Request;
      let query: Record<string, string>;
      let headers: Record<string, string>;
      let cookies: Record<string, string>;
      let params: Record<string, string>;
      let body: unknown;

      // 检测调用方式
      if (isHandlerContext(reqOrCtx)) {
        // 方式 2: defineRoute 传入的 HandlerContext
        req = reqOrCtx.req;
        query = reqOrCtx.query as Record<string, string>;
        headers = reqOrCtx.headers as Record<string, string>;
        cookies = reqOrCtx.cookies as Record<string, string>;
        params = reqOrCtx.params as Record<string, string>;
        body = reqOrCtx.body;
      } else {
        // 方式 1: route() 传入的 Request
        req = reqOrCtx;
        query = parseQuery(req) as Record<string, string>;
        headers = parseHeaders(req) as Record<string, string>;
        cookies = parseCookies(req) as Record<string, string>;
        params = ((req as unknown as Record<string, unknown>).params as Record<string, string>) || {};
        body = undefined;
      }

      // 验证 schema（仅在方式 1 时需要，方式 2 已由 defineRoute 验证）
      if (!isHandlerContext(reqOrCtx)) {
        const data = { body, query, params, headers, cookies };
        if (schema.body || schema.query || schema.params || schema.headers || schema.cookies) {
          validateAllSchemas(schema, data);
        }
      }

      // 创建 SSE 流
      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();

          try {
            const gen = generator({
              req,
              body: body as HandlerContext<T>['body'],
              query: query as HandlerContext<T>['query'],
              params: params as HandlerContext<T>['params'],
              headers: headers as HandlerContext<T>['headers'],
              cookies: cookies as HandlerContext<T>['cookies'],
            });

            for await (const event of gen) {
              const formatted = formatSSEEvent(event);
              controller.enqueue(encoder.encode(formatted));
            }
          } catch (error) {
            // 发送错误事件
            const errorEvent = formatSSEEvent({
              event: 'error',
              data: {
                message: error instanceof Error ? error.message : 'Unknown error'
              }
            });
            controller.enqueue(encoder.encode(errorEvent));
          } finally {
            controller.close();
          }
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no', // Nginx 禁用缓冲
        }
      });
    } catch (error) {
      // 验证错误等
      return new Response(
        JSON.stringify({
          code: 400,
          message: error instanceof Error ? error.message : 'Unknown error'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  };

  // 添加类型标记
  const handler = handlerFn as SSEHandler<T>;
  (handler as unknown as { __sse: SSEMarker }).__sse = { __brand: 'SSE' } as const;
  (handler as unknown as { __returnType: unknown }).__returnType = undefined;
  return handler;
}


