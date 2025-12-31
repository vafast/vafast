/**
 * 原生监控系统入口
 *
 * @author Framework Team
 * @version 2.0.0
 * @license MIT
 */

export * from "./types";
export * from "./native-monitor";

// 默认监控配置
export const defaultMonitoringConfig = {
  enabled: true,
  console: true,
  slowThreshold: 1000, // 1秒
  errorThreshold: 0.05, // 5%
  tags: {
    framework: "vafast",
    version: "2.0.0",
  },
};

// 创建监控配置
export function createMonitoringConfig(
  config: Partial<typeof defaultMonitoringConfig> = {},
) {
  return { ...defaultMonitoringConfig, ...config };
}
