/**
 * Go 风格的错误处理工具
 * 将 Promise 转换为 [Error | null, T | undefined] 格式
 *
 * @author Framework Team
 * @version 1.0.0
 * @license MIT
 */

/**
 * Go 风格的错误处理工具
 * 将 Promise 转换为 [Error | null, T | undefined] 格式
 *
 * @param promise 要处理的 Promise
 * @returns [Error | null, T | undefined] 元组，第一个元素是错误，第二个是结果
 *
 * @example
 * ```typescript
 * const [error, result] = await goAwait(someAsyncFunction());
 * if (error) {
 *   console.error("操作失败:", error);
 * } else {
 *   console.log("操作成功:", result);
 * }
 * ```
 */
export function goAwait<T>(
  promise: Promise<T>,
): Promise<[Error | null, T | undefined]> {
  return promise
    .then<[null, T]>((data) => [null, data])
    .catch<
      [Error, undefined]
    >((err) => [err instanceof Error ? err : new Error(String(err)), undefined]);
}
