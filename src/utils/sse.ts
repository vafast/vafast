/**
 * Server-Sent Events (SSE) 类型定义
 *
 * SSE 端点通过 `sse: true` 显式声明，handler 使用 async generator 语法
 *
 * ## 简单模式（推荐）
 * 
 * 直接 yield 任意数据，框架自动包装为 SSE data 字段：
 * 
 * ```typescript
 * defineRoute({
 *   method: 'POST',
 *   path: '/chat/stream',
 *   sse: true,
 *   handler: async function* ({ body }) {
 *     // 直接 yield 数据，框架自动处理
 *     yield { type: 'start', message: 'Starting...' }
 *
 *     for await (const chunk of aiStream(body.prompt)) {
 *       yield chunk  // 任意对象都可以
 *     }
 *
 *     yield { type: 'done', message: 'Complete!' }
 *   }
 * })
 * ```
 * 
 * ## 高级模式
 * 
 * 如果需要设置 SSE event/id/retry，使用 `__sse__` 标记：
 * 
 * ```typescript
 * yield { 
 *   __sse__: { event: 'status', id: '123', retry: 5000 },
 *   data: { progress: 50 }
 * }
 * ```
 */

/**
 * SSE 元数据（高级模式）
 */
export interface SSEMeta {
  /** SSE 事件名称 */
  event?: string;
  /** SSE 事件 ID */
  id?: string;
  /** SSE 重试间隔（毫秒） */
  retry?: number;
}

/**
 * 带元数据的 SSE 事件（高级模式）
 */
export interface SSEEventWithMeta<T = unknown> {
  /** SSE 元数据标记 */
  __sse__: SSEMeta;
  /** 事件数据 */
  data: T;
}

/**
 * SSE 事件类型（兼容旧版，不推荐使用）
 * @deprecated 直接 yield 数据即可，无需包装
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
