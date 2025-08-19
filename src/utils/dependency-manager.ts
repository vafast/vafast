/**
 * 依赖管理器
 * 负责按需加载和管理框架依赖
 */
export class DependencyManager {
  private dependencyCache = new Map<string, any>();

  /**
   * 按需获取框架依赖
   */
  async getFrameworkDeps(framework: "vue" | "react") {
    if (this.dependencyCache.has(framework)) {
      return this.dependencyCache.get(framework);
    }

    console.log(`📦 按需加载 ${framework} 依赖...`);

    try {
      let deps;
      switch (framework) {
        case "vue":
          deps = await Promise.all([import("vue"), import("@vue/server-renderer")]);
          break;
        case "react":
          deps = await Promise.all([import("react"), import("react-dom/server")]);
          break;
        default:
          throw new Error(`不支持的框架: ${framework}`);
      }

      this.dependencyCache.set(framework, deps);
      console.log(`✅ ${framework} 依赖加载完成`);
      return deps;
    } catch (error) {
      console.error(`❌ ${framework} 依赖加载失败:`, error);
      throw error;
    }
  }

  /**
   * 检测组件类型
   */
  detectComponentType(component: any): "vue" | "react" {
    // 简单的组件类型检测
    if (component.render && typeof component.render === "function") {
      return "vue";
    }
    if (component.$$typeof) {
      return "react";
    }
    // 默认使用 Vue
    return "vue";
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.dependencyCache.clear();
    console.log("🧹 依赖缓存已清除");
  }

  /**
   * 获取缓存状态
   */
  getCacheStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};
    for (const [framework] of this.dependencyCache) {
      status[framework] = true;
    }
    return status;
  }
}
