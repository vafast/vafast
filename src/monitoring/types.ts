/**
 * 性能监控系统类型定义
 * 
 * @author Framework Team
 * @version 1.0.0
 * @license MIT
 */

// 基础监控指标
export interface BaseMetrics {
  timestamp: number;
  requestId: string;
  method: string;
  path: string;
  statusCode: number;
  userAgent?: string;
  ip?: string;
}

// 性能指标
export interface PerformanceMetrics extends BaseMetrics {
  // 时间指标（毫秒）
  totalTime: number;           // 总请求时间
  routeMatchTime: number;      // 路由匹配时间
  validationTime: number;      // 验证时间
  handlerTime: number;         // 处理器执行时间
  responseTime: number;        // 响应生成时间
  
  // 内存指标（字节）
  memoryUsage: {
    heapUsed: number;          // 堆内存使用
    heapTotal: number;         // 堆内存总量
    external: number;          // 外部内存
    rss: number;               // 常驻内存
  };
  
  // 验证指标
  validation: {
    bodyValidated: boolean;    // 是否验证了请求体
    queryValidated: boolean;   // 是否验证了查询参数
    paramsValidated: boolean;  // 是否验证了路径参数
    headersValidated: boolean; // 是否验证了请求头
    cookiesValidated: boolean; // 是否验证了Cookie
    validationErrors: number;  // 验证错误数量
  };
  
  // 路由指标
  routing: {
    routeFound: boolean;       // 是否找到路由
    middlewareCount: number;   // 中间件数量
    dynamicParams: number;     // 动态参数数量
  };
  
  // 错误信息
  error?: {
    type: string;
    message: string;
    stack?: string;
  };
}

// 聚合指标
export interface AggregatedMetrics {
  // 时间范围
  timeRange: {
    start: number;
    end: number;
  };
  
  // 请求统计
  requests: {
    total: number;
    successful: number;
    failed: number;
    byMethod: Record<string, number>;
    byPath: Record<string, number>;
    byStatusCode: Record<number, number>;
  };
  
  // 性能统计
  performance: {
    avgTotalTime: number;
    avgRouteMatchTime: number;
    avgValidationTime: number;
    avgHandlerTime: number;
    avgResponseTime: number;
    
    p50TotalTime: number;
    p90TotalTime: number;
    p95TotalTime: number;
    p99TotalTime: number;
    
    minTotalTime: number;
    maxTotalTime: number;
  };
  
  // 内存统计
  memory: {
    avgHeapUsed: number;
    avgHeapTotal: number;
    maxHeapUsed: number;
    maxHeapTotal: number;
  };
  
  // 验证统计
  validation: {
    totalValidations: number;
    validationErrors: number;
    validationSuccessRate: number;
  };
  
  // 路由统计
  routing: {
    totalRoutes: number;
    routesWithMiddleware: number;
    dynamicRoutes: number;
    routeHitCount: Record<string, number>;
  };
}

// 监控配置
export interface MonitoringConfig {
  // 是否启用监控
  enabled: boolean;
  
  // 数据保留策略
  retention: {
    maxRecords: number;        // 最大记录数
    maxAge: number;            // 最大保留时间（毫秒）
    cleanupInterval: number;   // 清理间隔（毫秒）
  };
  
  // 采样率（0-1，1表示100%采样）
  samplingRate: number;
  
  // 是否记录详细错误信息
  recordErrors: boolean;
  
  // 是否记录请求体大小
  recordBodySize: boolean;
  
  // 是否记录响应体大小
  recordResponseSize: boolean;
  
  // 性能阈值告警
  thresholds: {
    slowRequest: number;       // 慢请求阈值（毫秒）
    highMemoryUsage: number;   // 高内存使用阈值（字节）
    errorRate: number;         // 错误率阈值（0-1）
  };
}

// 监控事件
export interface MonitoringEvent {
  type: 'request_start' | 'request_end' | 'validation_start' | 'validation_end' | 'error';
  timestamp: number;
  requestId: string;
  data: any;
}

// 性能报告
export interface PerformanceReport {
  id: string;
  timestamp: number;
  timeRange: {
    start: number;
    end: number;
  };
  summary: {
    totalRequests: number;
    avgResponseTime: number;
    errorRate: number;
    memoryUsage: number;
  };
  details: {
    topSlowestRoutes: Array<{ path: string; avgTime: number; count: number }>;
    topErrorRoutes: Array<{ path: string; errorCount: number; errorRate: number }>;
    memoryTrend: Array<{ timestamp: number; heapUsed: number }>;
    responseTimeDistribution: Record<string, number>;
  };
  recommendations: string[];
}
