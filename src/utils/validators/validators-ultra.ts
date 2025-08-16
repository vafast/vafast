/**
 * 超优化版Schema验证器
 *
 * 使用最激进的技术优化性能
 * - 内联函数调用
 * - 预编译缓存优化
 * - 批量验证优化
 * - 错误处理优化
 *
 * @author Framework Team
 * @version 3.0.0
 * @license MIT
 */

import { TypeCompiler } from "@sinclair/typebox/compiler";
import type { TSchema } from "@sinclair/typebox";

// 统一的Schema配置接口
export interface SchemaConfig {
  body?: TSchema;
  query?: TSchema;
  params?: TSchema;
  headers?: TSchema;
  cookies?: TSchema;
}

// 超优化的Schema缓存 - 使用Map避免WeakMap的查找开销
const ultraSchemaCache = new Map<TSchema, any>();
const schemaCacheHits = new Map<TSchema, number>();

// 获取或编译Schema - 内联优化版本
function getUltraSchemaCompiler(schema: TSchema): any {
  // 直接检查缓存，避免WeakMap的has()调用
  let compiler = ultraSchemaCache.get(schema);
  if (compiler) {
    // 缓存命中统计
    schemaCacheHits.set(schema, (schemaCacheHits.get(schema) || 0) + 1);
    return compiler;
  }

  try {
    compiler = TypeCompiler.Compile(schema);
    ultraSchemaCache.set(schema, compiler);
    return compiler;
  } catch (error) {
    return null;
  }
}

// 超优化的Schema验证函数 - 内联版本
export function validateSchemaUltra(schema: TSchema | undefined, data: any, context: string): any {
  if (!schema) return data;

  try {
    // 内联getSchemaCompiler逻辑，减少函数调用开销
    let compiler = ultraSchemaCache.get(schema);
    if (!compiler) {
      try {
        compiler = TypeCompiler.Compile(schema);
        ultraSchemaCache.set(schema, compiler);
      } catch (error) {
        throw new Error(`${context}验证失败: Schema编译失败`);
      }
    }

    // 直接验证，避免额外的函数调用
    if (!compiler.Check(data)) {
      // 超快速错误处理 - 跳过错误收集
      throw new Error(`${context}验证失败`);
    }

    return data;
  } catch (error) {
    if (error instanceof Error && error.message.includes("验证失败")) {
      throw error;
    }
    throw new Error(`${context}验证失败: ${error instanceof Error ? error.message : "未知错误"}`);
  }
}

// 超优化的批量验证 - 内联版本
export function validateAllSchemasUltra(
  config: SchemaConfig,
  data: {
    body: any;
    query: any;
    params: any;
    headers: any;
    cookies: any;
  }
): any {
  // 快速检查是否有任何验证器
  if (!config.body && !config.query && !config.params && !config.headers && !config.cookies) {
    return data; // 跳过所有验证
  }

  // 直接内联验证，避免map和async/await开销
  if (config.body) {
    validateSchemaUltra(config.body, data.body, "请求体");
  }

  if (config.query) {
    validateSchemaUltra(config.query, data.query, "Query参数");
  }

  if (config.params) {
    validateSchemaUltra(config.params, data.params, "路径参数");
  }

  if (config.headers) {
    validateSchemaUltra(config.headers, data.headers, "请求头");
  }

  if (config.cookies) {
    validateSchemaUltra(config.cookies, data.cookies, "Cookie");
  }

  return data;
}

// 超优化的预编译 - 批量预编译
export function precompileSchemasUltra(config: SchemaConfig): void {
  // 快速检查是否有任何验证器
  if (!config.body && !config.query && !config.params && !config.headers && !config.cookies) {
    return; // 跳过预编译
  }

  // 批量预编译，减少函数调用
  const schemas = [config.body, config.query, config.params, config.headers, config.cookies];
  for (const schema of schemas) {
    if (schema) {
      getUltraSchemaCompiler(schema);
    }
  }
}

// 获取缓存统计
export function getCacheStats() {
  const totalSchemas = ultraSchemaCache.size;
  const totalHits = Array.from(schemaCacheHits.values()).reduce((sum, hits) => sum + hits, 0);
  const hitRate =
    totalHits > 0 ? ((totalHits / (totalHits + totalSchemas)) * 100).toFixed(2) : "0.00";

  return {
    totalSchemas,
    totalHits,
    hitRate: `${hitRate}%`,
    cacheSize: ultraSchemaCache.size,
  };
}

// 清理缓存
export function clearUltraCache(): void {
  ultraSchemaCache.clear();
  schemaCacheHits.clear();
}
