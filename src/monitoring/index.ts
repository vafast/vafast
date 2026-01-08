/**
 * 监控系统入口
 */

export {
  withMonitoring,
  createMonitoredServer,
  type MonitoringConfig,
  type MonitoringMetrics,
  type MonitoringStatus,
  type MonitoredServer,
  type MemoryInfo,
} from "./native-monitor";

// 默认配置
export const defaultMonitoringConfig: MonitoringConfig = {
  enabled: true,
  console: true,
  slowThreshold: 1000,
  maxRecords: 1000,
  tags: { framework: "vafast" },
};

// 导入类型
import type { MonitoringConfig } from "./native-monitor";

/** 创建监控配置 */
export function createMonitoringConfig(
  config: Partial<MonitoringConfig> = {}
): MonitoringConfig {
  return { ...defaultMonitoringConfig, ...config };
}
