export interface MatchResult {
  matched: boolean;
  params: Record<string, string>;
}

/**
 * 匹配函数：支持动态路由
 */
export function matchPath(pattern: string, path: string): MatchResult {
  const patternParts = pattern.split("/").filter(Boolean);
  const pathParts = path.split("/").filter(Boolean);

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
