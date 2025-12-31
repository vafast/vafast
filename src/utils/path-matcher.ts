/**
 * 路径匹配工具类
 * 提供统一的路径匹配和参数提取功能
 */
export class PathMatcher {
  /**
   * 路径匹配
   */
  static matchPath(pattern: string, path: string): boolean {
    const patternParts = pattern.split("/").filter(Boolean);
    const pathParts = path.split("/").filter(Boolean);

    if (patternParts.length !== pathParts.length) {
      return false;
    }

    for (let i = 0; i < patternParts.length; i++) {
      if (
        patternParts[i] !== pathParts[i] &&
        !patternParts[i].startsWith(":")
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * 提取路径参数
   */
  static extractParams(pattern: string, path: string): Record<string, string> {
    const params: Record<string, string> = {};
    const patternParts = pattern.split("/").filter(Boolean);
    const pathParts = path.split("/").filter(Boolean);

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(":")) {
        const paramName = patternParts[i].slice(1);
        params[paramName] = pathParts[i];
      }
    }

    return params;
  }

  /**
   * 计算路径特异性分数
   * 用于路由排序：静态 > 动态(:param) > 通配符(*)
   */
  static calculatePathScore(path: string): number {
    const parts = path.split("/").filter(Boolean);
    let score = 0;
    for (const p of parts) {
      if (p === "*")
        score += 1; // 最弱
      else if (p.startsWith(":"))
        score += 2; // 中等
      else score += 3; // 静态最强
    }
    // 更长的路径更具体，略微提升
    return score * 10 + parts.length;
  }

  /**
   * 判断两个路径是否可能冲突
   */
  static pathsMayConflict(path1: string, path2: string): boolean {
    const parts1 = path1.split("/").filter(Boolean);
    const parts2 = path2.split("/").filter(Boolean);

    if (parts1.length !== parts2.length) return false;

    for (let i = 0; i < parts1.length; i++) {
      const p1 = parts1[i];
      const p2 = parts2[i];

      // 如果两个部分都是静态的且不同，则不会冲突
      if (
        !p1.startsWith(":") &&
        !p1.startsWith("*") &&
        !p2.startsWith(":") &&
        !p2.startsWith("*") &&
        p1 !== p2
      ) {
        return false;
      }

      // 如果一个是通配符，另一个是动态参数，可能冲突
      if (
        (p1 === "*" && p2.startsWith(":")) ||
        (p2 === "*" && p1.startsWith(":"))
      ) {
        return true;
      }
    }

    return false;
  }
}
