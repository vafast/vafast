/**
 * 监控系统入口（零外部依赖）
 */

export {
  withMonitoring,
  createMonitoredServer,
  type MonitoringConfig,
  type MonitoringMetrics,
  type MonitoringStatus,
  type MonitoredServer,
  type MemoryInfo,
  type PathStats,
} from "./native-monitor";
