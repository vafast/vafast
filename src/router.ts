export interface MatchResult {
  matched: boolean;
  params: Record<string, string>;
}

/**
 * 标准化路径：去重斜杠、解码URL、处理结尾斜杠
 */
export function normalizePath(path: string): string {
  // 解码 URL 编码的字符
  let normalized = decodeURIComponent(path);
  
  // 去重连续的斜杠
  normalized = normalized.replace(/\/+/g, "/");
  
  // 处理根路径
  if (normalized === "") normalized = "/";
  
  // 去掉结尾斜杠（除非是根路径）
  if (normalized !== "/" && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }
  
  return normalized;
}

/**
 * 匹配函数：支持动态路由和路径标准化
 */
export function matchPath(pattern: string, path: string): MatchResult {
  // 标准化输入路径
  const normalizedPath = normalizePath(path);
  const patternParts = pattern.split("/").filter(Boolean);
  const pathParts = normalizedPath.split("/").filter(Boolean);

  const params: Record<string, string> = {};

  for (let i = 0; i < patternParts.length; i++) {
    const pat = patternParts[i];
    const part = pathParts[i];

    if (pat === "*") {
      params["*"] = pathParts.slice(i).join("/");
      return { matched: true, params };
    }

    if (pat.startsWith(":")) {
      if (!part) return { matched: false, params: {} };
      params[pat.slice(1)] = part;
      continue;
    }

    if (pat !== part) return { matched: false, params: {} };
  }

  if (patternParts.length !== pathParts.length) return { matched: false, params: {} };

  return { matched: true, params };
}
