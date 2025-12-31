// src/utils/serializers/json-serializer.ts
/**
 * 高性能 JSON 序列化器
 *
 * 基于 TypeBox Schema 的 JIT 编译序列化
 * 根据已知的数据结构生成专门的序列化函数，避免 JSON.stringify 的反射开销
 *
 * @version 1.0.0
 */

import type { TSchema, TObject, TArray } from "@sinclair/typebox";
import { Kind } from "@sinclair/typebox";

/** 序列化函数类型 */
type Serializer = (value: unknown) => string;

/**
 * 序列化器缓存
 * 使用 WeakMap 避免内存泄漏
 */
const serializerCache = new WeakMap<TSchema, Serializer>();

/**
 * 转义 JSON 字符串中的特殊字符
 * 比 JSON.stringify 更快的实现（针对常见情况优化）
 */
function escapeString(str: string): string {
  // 快速路径：如果字符串不需要转义，直接返回
  let needsEscape = false;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code < 32 || code === 34 || code === 92) {
      needsEscape = true;
      break;
    }
  }

  if (!needsEscape) {
    return `"${str}"`;
  }

  // 需要转义的情况
  let result = '"';
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const code = str.charCodeAt(i);

    if (code === 34) {
      result += '\\"';
    } else if (code === 92) {
      result += "\\\\";
    } else if (code === 10) {
      result += "\\n";
    } else if (code === 13) {
      result += "\\r";
    } else if (code === 9) {
      result += "\\t";
    } else if (code < 32) {
      result += `\\u${code.toString(16).padStart(4, "0")}`;
    } else {
      result += char;
    }
  }
  result += '"';
  return result;
}

/**
 * 为对象 Schema 生成序列化代码
 */
function generateObjectSerializer(schema: TObject): Serializer {
  const properties = schema.properties;
  const keys = Object.keys(properties);

  if (keys.length === 0) {
    return () => "{}";
  }

  // 生成优化的序列化函数
  const propertySerializers: Array<{
    key: string;
    serializer: Serializer;
    optional: boolean;
  }> = [];

  for (const key of keys) {
    const propSchema = properties[key];
    const serializer = compileSerializer(propSchema);
    const optional = schema.required ? !schema.required.includes(key) : true;
    propertySerializers.push({ key, serializer, optional });
  }

  return (value: unknown) => {
    const obj = value as Record<string, unknown>;
    let result = "{";
    let isFirst = true;

    for (const { key, serializer, optional } of propertySerializers) {
      const propValue = obj[key];

      if (propValue === undefined) {
        if (!optional) {
          // 必须属性但值为 undefined，输出 null
          if (!isFirst) result += ",";
          result += `"${key}":null`;
          isFirst = false;
        }
        continue;
      }

      if (!isFirst) result += ",";
      result += `"${key}":${serializer(propValue)}`;
      isFirst = false;
    }

    result += "}";
    return result;
  };
}

/**
 * 为数组 Schema 生成序列化代码
 */
function generateArraySerializer(schema: TArray): Serializer {
  const itemsSchema = schema.items;
  const itemSerializer = compileSerializer(itemsSchema);

  return (value: unknown) => {
    const arr = value as unknown[];
    if (arr.length === 0) return "[]";

    let result = "[";
    result += itemSerializer(arr[0]);

    for (let i = 1; i < arr.length; i++) {
      result += ",";
      result += itemSerializer(arr[i]);
    }

    result += "]";
    return result;
  };
}

/**
 * 根据 Schema 类型生成对应的序列化器
 */
function compileSerializer(schema: TSchema): Serializer {
  // 检查缓存
  const cached = serializerCache.get(schema);
  if (cached) {
    return cached;
  }

  // 根据 Schema Kind 生成序列化器
  const kind = schema[Kind];
  let serializer: Serializer;

  switch (kind) {
    case "String":
      serializer = (value: unknown) => escapeString(value as string);
      break;

    case "Number":
    case "Integer":
      serializer = (value: unknown) => {
        const num = value as number;
        if (Number.isFinite(num)) {
          return String(num);
        }
        return "null"; // NaN, Infinity -> null (JSON 规范)
      };
      break;

    case "Boolean":
      serializer = (value: unknown) => ((value as boolean) ? "true" : "false");
      break;

    case "Null":
      serializer = () => "null";
      break;

    case "Object":
      serializer = generateObjectSerializer(schema as unknown as TObject);
      break;

    case "Array":
      serializer = generateArraySerializer(schema as unknown as TArray);
      break;

    case "Union":
      // Union 类型回退到 JSON.stringify
      serializer = (value: unknown) => JSON.stringify(value);
      break;

    case "Literal": {
      // 字面量类型，可以预计算
      const literalSchema = schema as unknown as { const: unknown };
      const literalJson = JSON.stringify(literalSchema.const);
      serializer = () => literalJson;
      break;
    }

    case "Optional": {
      // Optional 类型，委托给内部类型
      const optionalSchema = schema as unknown as { type: TSchema };
      const innerSerializer = compileSerializer(optionalSchema.type);
      serializer = (value: unknown) => {
        if (value === undefined) return "null";
        return innerSerializer(value);
      };
      break;
    }

    default:
      // 未知类型，回退到 JSON.stringify
      serializer = (value: unknown) => JSON.stringify(value);
  }

  // 缓存序列化器
  serializerCache.set(schema, serializer);
  return serializer;
}

/**
 * 获取或创建编译后的序列化器
 * @param schema TypeBox Schema
 * @returns 编译后的序列化器
 */
export function getCompiledSerializer<T extends TSchema>(schema: T): Serializer {
  return compileSerializer(schema);
}

/**
 * 使用 Schema 序列化数据（带缓存优化）
 * @param schema TypeBox Schema
 * @param data 要序列化的数据
 * @returns JSON 字符串
 */
export function serializeWithSchema<T extends TSchema>(
  schema: T,
  data: unknown,
): string {
  const serializer = compileSerializer(schema);
  return serializer(data);
}

/**
 * 创建类型特化的序列化器（最高性能）
 * 适用于频繁序列化同一 Schema 的场景
 * @param schema TypeBox Schema
 * @returns 类型安全的序列化函数
 */
export function createSerializer<T extends TSchema>(
  schema: T,
): (data: unknown) => string {
  return compileSerializer(schema);
}

/**
 * 预编译 Schema 序列化器（在启动时调用）
 * @param schemas 要预编译的 Schema 数组
 */
export function precompileSerializers(schemas: TSchema[]): void {
  for (const schema of schemas) {
    compileSerializer(schema);
  }
}

/**
 * 获取序列化器缓存统计信息（用于调试）
 */
export function getSerializerCacheStats(): { cacheType: string; note: string } {
  return {
    cacheType: "WeakMap",
    note: "WeakMap 不支持 size 属性，缓存会随 Schema 对象自动清理",
  };
}

/**
 * 超快速 JSON 序列化
 * 针对简单类型的优化路径，避免函数调用开销
 */
export function fastSerialize(value: unknown): string {
  // 快速类型判断路径
  if (value === null) return "null";
  if (value === undefined) return "null";

  const type = typeof value;

  if (type === "string") {
    return escapeString(value as string);
  }

  if (type === "number") {
    return Number.isFinite(value as number) ? String(value) : "null";
  }

  if (type === "boolean") {
    return value ? "true" : "false";
  }

  // 复杂类型回退到 JSON.stringify
  return JSON.stringify(value);
}

/**
 * 批量序列化（优化多个值的序列化）
 * @param values 要序列化的值数组
 * @returns JSON 字符串数组
 */
export function batchSerialize(values: unknown[]): string[] {
  return values.map(fastSerialize);
}
