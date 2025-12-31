// tests/unit/serializer-optimized.test.ts
/**
 * 序列化器优化测试
 *
 * 测试 JIT 编译序列化器的功能和性能
 */

import { describe, it, expect, beforeEach } from "vitest";
import { Type } from "@sinclair/typebox";
import {
  serializeWithSchema,
  createSerializer,
  precompileSerializers,
  getSerializerCacheStats,
  fastSerialize,
  batchSerialize,
} from "../../src/utils/serializers/json-serializer";

describe("序列化器优化测试", () => {
  describe("fastSerialize 基础功能", () => {
    it("应该正确序列化 null", () => {
      expect(fastSerialize(null)).toBe("null");
    });

    it("应该正确序列化 undefined", () => {
      expect(fastSerialize(undefined)).toBe("null");
    });

    it("应该正确序列化字符串", () => {
      expect(fastSerialize("hello")).toBe('"hello"');
      expect(fastSerialize("")).toBe('""');
    });

    it("应该正确转义特殊字符", () => {
      expect(fastSerialize('hello "world"')).toBe('"hello \\"world\\""');
      expect(fastSerialize("line1\nline2")).toBe('"line1\\nline2"');
      expect(fastSerialize("tab\there")).toBe('"tab\\there"');
      expect(fastSerialize("back\\slash")).toBe('"back\\\\slash"');
    });

    it("应该正确序列化数字", () => {
      expect(fastSerialize(42)).toBe("42");
      expect(fastSerialize(3.14)).toBe("3.14");
      expect(fastSerialize(-100)).toBe("-100");
      expect(fastSerialize(0)).toBe("0");
    });

    it("应该将 NaN 和 Infinity 序列化为 null", () => {
      expect(fastSerialize(NaN)).toBe("null");
      expect(fastSerialize(Infinity)).toBe("null");
      expect(fastSerialize(-Infinity)).toBe("null");
    });

    it("应该正确序列化布尔值", () => {
      expect(fastSerialize(true)).toBe("true");
      expect(fastSerialize(false)).toBe("false");
    });

    it("应该正确序列化对象", () => {
      const result = fastSerialize({ name: "test", age: 30 });
      expect(JSON.parse(result)).toEqual({ name: "test", age: 30 });
    });

    it("应该正确序列化数组", () => {
      const result = fastSerialize([1, 2, 3]);
      expect(JSON.parse(result)).toEqual([1, 2, 3]);
    });
  });

  describe("serializeWithSchema 功能测试", () => {
    it("应该使用 String Schema 序列化", () => {
      const schema = Type.String();
      expect(serializeWithSchema(schema, "hello")).toBe('"hello"');
    });

    it("应该使用 Number Schema 序列化", () => {
      const schema = Type.Number();
      expect(serializeWithSchema(schema, 42)).toBe("42");
    });

    it("应该使用 Boolean Schema 序列化", () => {
      const schema = Type.Boolean();
      expect(serializeWithSchema(schema, true)).toBe("true");
      expect(serializeWithSchema(schema, false)).toBe("false");
    });

    it("应该使用 Object Schema 序列化", () => {
      const schema = Type.Object({
        name: Type.String(),
        age: Type.Number(),
      });

      const data = { name: "John", age: 30 };
      const result = serializeWithSchema(schema, data);

      expect(JSON.parse(result)).toEqual(data);
    });

    it("应该使用 Array Schema 序列化", () => {
      const schema = Type.Array(Type.Number());
      const data = [1, 2, 3, 4, 5];
      const result = serializeWithSchema(schema, data);

      expect(JSON.parse(result)).toEqual(data);
    });

    it("应该正确处理嵌套对象", () => {
      const schema = Type.Object({
        user: Type.Object({
          name: Type.String(),
          email: Type.String(),
        }),
        count: Type.Number(),
      });

      const data = {
        user: { name: "John", email: "john@example.com" },
        count: 5,
      };

      const result = serializeWithSchema(schema, data);
      expect(JSON.parse(result)).toEqual(data);
    });

    it("应该正确处理空数组", () => {
      const schema = Type.Array(Type.String());
      expect(serializeWithSchema(schema, [])).toBe("[]");
    });

    it("应该正确处理空对象", () => {
      const schema = Type.Object({});
      expect(serializeWithSchema(schema, {})).toBe("{}");
    });
  });

  describe("createSerializer 功能测试", () => {
    it("应该创建可复用的序列化器", () => {
      const schema = Type.Object({
        id: Type.Number(),
        name: Type.String(),
      });

      const serializer = createSerializer(schema);

      const result1 = serializer({ id: 1, name: "Alice" });
      const result2 = serializer({ id: 2, name: "Bob" });

      expect(JSON.parse(result1)).toEqual({ id: 1, name: "Alice" });
      expect(JSON.parse(result2)).toEqual({ id: 2, name: "Bob" });
    });
  });

  describe("precompileSerializers 功能测试", () => {
    it("应该预编译多个 Schema", () => {
      const schemas = [
        Type.Object({ name: Type.String() }),
        Type.Array(Type.Number()),
        Type.String(),
      ];

      // 预编译不应该抛出错误
      expect(() => precompileSerializers(schemas)).not.toThrow();

      // 验证预编译后序列化器能正常工作
      const result = serializeWithSchema(schemas[0], { name: "test" });
      expect(JSON.parse(result)).toEqual({ name: "test" });
    });
  });

  describe("batchSerialize 功能测试", () => {
    it("应该批量序列化多个值", () => {
      const values = ["hello", 42, true, null];
      const results = batchSerialize(values);

      expect(results).toEqual(['"hello"', "42", "true", "null"]);
    });
  });

  describe("缓存功能测试", () => {
    it("应该返回正确的缓存统计信息", () => {
      const stats = getSerializerCacheStats();
      expect(stats.cacheType).toBe("WeakMap");
      expect(stats.note).toContain("WeakMap");
    });

    it("相同 Schema 应该使用缓存", () => {
      const schema = Type.Object({
        name: Type.String(),
        value: Type.Number(),
      });

      // 创建两个序列化器应该使用相同的缓存
      const serializer1 = createSerializer(schema);
      const serializer2 = createSerializer(schema);

      // 应该是同一个函数引用
      expect(serializer1).toBe(serializer2);
    });
  });

  describe("性能基准测试", () => {
    const testData = {
      id: 12345,
      name: "John Doe",
      email: "john.doe@example.com",
      age: 30,
      active: true,
      tags: ["user", "premium", "verified"],
      metadata: {
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-12-31T23:59:59Z",
      },
    };

    const testSchema = Type.Object({
      id: Type.Number(),
      name: Type.String(),
      email: Type.String(),
      age: Type.Number(),
      active: Type.Boolean(),
      tags: Type.Array(Type.String()),
      metadata: Type.Object({
        createdAt: Type.String(),
        updatedAt: Type.String(),
      }),
    });

    it("fastSerialize: 10000 次序列化性能测试", () => {
      const iterations = 10000;

      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        fastSerialize(testData);
      }
      const end = performance.now();

      console.log(
        `fastSerialize: ${iterations} 次序列化耗时 ${(end - start).toFixed(2)}ms`,
      );
      console.log(
        `  平均每次: ${((end - start) / iterations * 1000).toFixed(2)}μs`,
      );

      // 性能断言：10000 次序列化应该在合理时间内完成
      expect(end - start).toBeLessThan(100); // 100ms 内完成
    });

    it("serializeWithSchema: 10000 次序列化性能测试", () => {
      const iterations = 10000;

      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        serializeWithSchema(testSchema, testData);
      }
      const end = performance.now();

      console.log(
        `serializeWithSchema: ${iterations} 次序列化耗时 ${(end - start).toFixed(2)}ms`,
      );
      console.log(
        `  平均每次: ${((end - start) / iterations * 1000).toFixed(2)}μs`,
      );

      expect(end - start).toBeLessThan(100);
    });

    it("createSerializer (预编译): 10000 次序列化性能测试", () => {
      const iterations = 10000;
      const serializer = createSerializer(testSchema);

      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        serializer(testData);
      }
      const end = performance.now();

      console.log(
        `createSerializer: ${iterations} 次序列化耗时 ${(end - start).toFixed(2)}ms`,
      );
      console.log(
        `  平均每次: ${((end - start) / iterations * 1000).toFixed(2)}μs`,
      );

      expect(end - start).toBeLessThan(100);
    });

    it("JSON.stringify 对比: 10000 次序列化性能测试", () => {
      const iterations = 10000;

      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        JSON.stringify(testData);
      }
      const end = performance.now();

      console.log(
        `JSON.stringify: ${iterations} 次序列化耗时 ${(end - start).toFixed(2)}ms`,
      );
      console.log(
        `  平均每次: ${((end - start) / iterations * 1000).toFixed(2)}μs`,
      );
    });

    it("简单字符串序列化: 100000 次性能测试", () => {
      const iterations = 100000;
      const testString = "Hello, World! This is a test string.";

      // fastSerialize
      const start1 = performance.now();
      for (let i = 0; i < iterations; i++) {
        fastSerialize(testString);
      }
      const end1 = performance.now();

      // JSON.stringify
      const start2 = performance.now();
      for (let i = 0; i < iterations; i++) {
        JSON.stringify(testString);
      }
      const end2 = performance.now();

      console.log(
        `字符串序列化 ${iterations} 次:`,
      );
      console.log(`  fastSerialize: ${(end1 - start1).toFixed(2)}ms`);
      console.log(`  JSON.stringify: ${(end2 - start2).toFixed(2)}ms`);
    });
  });
});

