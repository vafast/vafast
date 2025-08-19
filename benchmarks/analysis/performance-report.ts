/**
 * 性能报告生成工具
 *
 * 用于分析基准测试结果并生成详细的性能报告
 */

export interface PerformanceMetrics {
  name: string;
  iterations: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  operationsPerSecond: number;
  memoryUsage?: {
    before: number;
    after: number;
    delta: number;
  };
}

export interface PerformanceReport {
  timestamp: string;
  framework: string;
  version: string;
  environment: string;
  metrics: PerformanceMetrics[];
  summary: {
    totalTests: number;
    averageOpsPerSecond: number;
    fastestTest: string;
    slowestTest: string;
  };
}

/**
 * 生成性能报告
 */
export function generatePerformanceReport(
  metrics: PerformanceMetrics[],
  framework: string = "Vafast",
  version: string = "0.1.17"
): PerformanceReport {
  const totalTests = metrics.length;
  const averageOpsPerSecond =
    metrics.reduce((sum, m) => sum + m.operationsPerSecond, 0) / totalTests;

  const fastestTest = metrics.reduce((fastest, current) =>
    current.operationsPerSecond > fastest.operationsPerSecond
      ? current
      : fastest
  );

  const slowestTest = metrics.reduce((slowest, current) =>
    current.operationsPerSecond < slowest.operationsPerSecond
      ? current
      : slowest
  );

  return {
    timestamp: new Date().toISOString(),
    framework,
    version,
    environment: process.env.NODE_ENV || "development",
    metrics,
    summary: {
      totalTests,
      averageOpsPerSecond,
      fastestTest: fastestTest.name,
      slowestTest: slowestTest.name,
    },
  };
}

/**
 * 格式化性能报告为可读文本
 */
export function formatPerformanceReport(report: PerformanceReport): string {
  let output = `\n🚀 ${report.framework} v${report.version} 性能报告\n`;
  output += `================================================\n`;
  output += `📅 测试时间: ${new Date(report.timestamp).toLocaleString()}\n`;
  output += `🌍 环境: ${report.environment}\n`;
  output += `📊 测试总数: ${report.summary.totalTests}\n\n`;

  // 详细指标
  output += `📈 详细性能指标:\n`;
  output += `------------------------------------------------\n`;

  report.metrics.forEach((metric, index) => {
    output += `${index + 1}. ${metric.name}\n`;
    output += `   迭代次数: ${metric.iterations.toLocaleString()}\n`;
    output += `   总耗时: ${metric.totalTime.toFixed(2)}ms\n`;
    output += `   平均耗时: ${metric.averageTime.toFixed(4)}ms\n`;
    output += `   操作/秒: ${metric.operationsPerSecond.toLocaleString()}\n`;

    if (metric.memoryUsage) {
      output += `   内存变化: ${metric.memoryUsage.delta.toFixed(2)}MB\n`;
    }
    output += `\n`;
  });

  // 总结
  output += `📋 性能总结:\n`;
  output += `------------------------------------------------\n`;
  output += `🏆 最快测试: ${report.summary.fastestTest}\n`;
  output += `🐌 最慢测试: ${report.summary.slowestTest}\n`;
  output += `📊 平均性能: ${report.summary.averageOpsPerSecond.toLocaleString()} ops/sec\n`;

  return output;
}

/**
 * 导出性能报告为JSON文件
 */
export function exportPerformanceReport(
  report: PerformanceReport,
  filename?: string
): void {
  const defaultFilename = `performance-report-${
    new Date().toISOString().split("T")[0]
  }.json`;
  const finalFilename = filename || defaultFilename;

  const fs = require("fs");
  fs.writeFileSync(finalFilename, JSON.stringify(report, null, 2));
  console.log(`📄 性能报告已导出到: ${finalFilename}`);
}

/**
 * 比较两个性能报告
 */
export function comparePerformanceReports(
  current: PerformanceReport,
  previous: PerformanceReport
): string {
  let output = `\n🔄 性能对比报告\n`;
  output += `================================================\n`;
  output += `📅 对比时间: ${new Date().toISOString().split("T")[0]}\n`;
  output += `📊 当前版本: ${current.version}\n`;
  output += `📊 历史版本: ${previous.version}\n\n`;

  // 总体性能对比
  const currentAvg = current.summary.averageOpsPerSecond;
  const previousAvg = previous.summary.averageOpsPerSecond;
  const performanceChange = ((currentAvg - previousAvg) / previousAvg) * 100;

  output += `📈 总体性能变化:\n`;
  output += `------------------------------------------------\n`;
  output += `当前平均: ${currentAvg.toLocaleString()} ops/sec\n`;
  output += `历史平均: ${previousAvg.toLocaleString()} ops/sec\n`;
  output += `变化幅度: ${
    performanceChange > 0 ? "+" : ""
  }${performanceChange.toFixed(2)}%\n`;

  if (performanceChange > 5) {
    output += `🎉 性能显著提升！\n`;
  } else if (performanceChange < -5) {
    output += `⚠️  性能有所下降，需要关注\n`;
  } else {
    output += `✅ 性能保持稳定\n`;
  }
  output += `\n`;

  // 详细对比
  output += `📊 详细对比:\n`;
  output += `------------------------------------------------\n`;

  current.metrics.forEach((currentMetric) => {
    const previousMetric = previous.metrics.find(
      (m) => m.name === currentMetric.name
    );
    if (previousMetric) {
      const change =
        ((currentMetric.operationsPerSecond -
          previousMetric.operationsPerSecond) /
          previousMetric.operationsPerSecond) *
        100;
      output += `${currentMetric.name}:\n`;
      output += `  当前: ${currentMetric.operationsPerSecond.toLocaleString()} ops/sec\n`;
      output += `  历史: ${previousMetric.operationsPerSecond.toLocaleString()} ops/sec\n`;
      output += `  变化: ${change > 0 ? "+" : ""}${change.toFixed(2)}%\n\n`;
    }
  });

  return output;
}
