/**
 * 路由工具函数
 */

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
