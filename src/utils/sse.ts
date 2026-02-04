/**
 * Server-Sent Events (SSE) 类型定义
 *
 * SSE 端点通过 `sse: true` 显式声明，handler 使用 async generator 语法
 *
 * @example
 * ```typescript
 * import { defineRoute, Type } from 'vafast'
 *
 * defineRoute({
 *   method: 'POST',
 *   path: '/chat/stream',
 *   sse: true,  // 显式声明 SSE 端点
 *   schema: {
 *     body: Type.Object({ prompt: Type.String() })
 *   },
 *   handler: async function* ({ body }) {
 *     yield { event: 'start', data: { message: 'Starting...' } }
 *
 *     for await (const chunk of aiStream(body.prompt)) {
 *       yield { data: chunk }
 *     }
 *
 *     yield { event: 'end', data: { message: 'Done!' } }
 *   }
 * })
 * ```
 */

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
