import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Type } from "@sinclair/typebox";
import {
  validateSchemaConfig,
  type SchemaConfig,
  type RequestData,
} from "../../src/utils/validators/schema-validator";
import {
  validateAllSchemasUltra,
  clearUltraCache,
} from "../../src/utils/validators/schema-validators-ultra";

// 测试用的Schema定义
const userSchema = Type.Object({
  id: Type.Number(),
  name: Type.String(),
  email: Type.String(),
  age: Type.Number({ minimum: 0, maximum: 150 }),
  isActive: Type.Boolean(),
});

const querySchema = Type.Object({
  page: Type.Number({ minimum: 1 }),
  limit: Type.Number({ minimum: 1, maximum: 100 }),
  search: Type.Optional(Type.String()),
});

const paramsSchema = Type.Object({
  userId: Type.String(),
});

const headersSchema = Type.Object({
  authorization: Type.String(),
  "content-type": Type.String(),
});

const cookiesSchema = Type.Object({
  sessionId: Type.String(),
  theme: Type.Optional(Type.String()),
});

// 测试数据
const validUser = {
  id: 1,
  name: "张三",
  email: "zhangsan@example.com",
  age: 25,
  isActive: true,
};

const validQuery = {
  page: 1,
  limit: 20,
  search: "测试",
};

const validParams = {
  userId: "507f1f77bcf86cd799439011",
};

const validHeaders = {
  authorization: "Bearer token123",
  "content-type": "application/json",
};

const validCookies = {
  sessionId: "sess_123456",
  theme: "light",
};

describe("验证器性能对比测试", () => {
  beforeEach(() => {
    clearUltraCache();
  });

  afterEach(() => {
    clearUltraCache();
  });

  describe("单次验证性能对比", () => {
    it("应该对比单次验证性能", () => {
      const iterations = 1000;

      // 测试原来的验证器
      const start1 = performance.now();
      for (let i = 0; i < iterations; i++) {
        const config: SchemaConfig = { body: userSchema };
        const data: RequestData = { body: validUser };
        validateSchemaConfig(config, data);
      }
      const end1 = performance.now();
      const originalTime = end1 - start1;

      // 测试优化后的验证器
      const start2 = performance.now();
      for (let i = 0; i < iterations; i++) {
        validateAllSchemasUltra({ body: userSchema }, { body: validUser });
      }
      const end2 = performance.now();
      const optimizedTime = end2 - start2;

      console.log("=== 单次验证性能对比 ===");
      console.log(`原来验证器: ${originalTime.toFixed(2)}ms (${iterations}次)`);
      console.log(
        `优化验证器: ${optimizedTime.toFixed(2)}ms (${iterations}次)`
      );
      console.log(`性能提升: ${(originalTime / optimizedTime).toFixed(2)}x`);
      console.log(`平均时间对比:`);
      console.log(`  原来: ${(originalTime / iterations).toFixed(6)}ms`);
      console.log(`  优化: ${(optimizedTime / iterations).toFixed(6)}ms`);

      expect(optimizedTime).toBeLessThan(originalTime);
    });
  });

  describe("批量验证性能对比", () => {
    it("应该对比批量验证性能", () => {
      const config: SchemaConfig = {
        body: userSchema,
        query: querySchema,
        params: paramsSchema,
        headers: headersSchema,
        cookies: cookiesSchema,
      };

      const data: RequestData = {
        body: validUser,
        query: validQuery,
        params: validParams,
        headers: validHeaders,
        cookies: validCookies,
      };

      const iterations = 1000;

      // 测试原来的验证器
      const start1 = performance.now();
      for (let i = 0; i < iterations; i++) {
        validateSchemaConfig(config, data);
      }
      const end1 = performance.now();
      const originalTime = end1 - start1;

      // 测试优化后的验证器
      const start2 = performance.now();
      for (let i = 0; i < iterations; i++) {
        validateAllSchemasUltra(config, {
          body: validUser,
          query: validQuery,
          params: validParams,
          headers: validHeaders,
          cookies: validCookies,
        });
      }
      const end2 = performance.now();
      const optimizedTime = end2 - start2;

      console.log("=== 批量验证性能对比 ===");
      console.log(`原来验证器: ${originalTime.toFixed(2)}ms (${iterations}次)`);
      console.log(
        `优化验证器: ${optimizedTime.toFixed(2)}ms (${iterations}次)`
      );
      console.log(`性能提升: ${(originalTime / optimizedTime).toFixed(2)}x`);
      console.log(`平均时间对比:`);
      console.log(`  原来: ${(originalTime / iterations).toFixed(6)}ms`);
      console.log(`  优化: ${(optimizedTime / iterations).toFixed(6)}ms`);

      expect(optimizedTime).toBeLessThan(originalTime);
    });
  });

  describe("复杂Schema验证性能对比", () => {
    it("应该对比复杂Schema验证性能", () => {
      const complexSchema = Type.Object({
        users: Type.Array(userSchema),
        metadata: Type.Object({
          total: Type.Number(),
          page: Type.Number(),
          hasMore: Type.Boolean(),
        }),
        filters: Type.Object({
          ageRange: Type.Object({
            min: Type.Number(),
            max: Type.Number(),
          }),
          status: Type.Array(Type.String()),
        }),
      });

      const complexData = {
        users: Array.from({ length: 100 }, (_, i) => ({
          ...validUser,
          id: i + 1,
          name: `用户${i + 1}`,
        })),
        metadata: {
          total: 1000,
          page: 1,
          hasMore: true,
        },
        filters: {
          ageRange: { min: 18, max: 65 },
          status: ["active", "verified"],
        },
      };

      const iterations = 100;

      // 测试原来的验证器
      const start1 = performance.now();
      for (let i = 0; i < iterations; i++) {
        const config: SchemaConfig = { body: complexSchema };
        const data: RequestData = { body: complexData };
        validateSchemaConfig(config, data);
      }
      const end1 = performance.now();
      const originalTime = end1 - start1;

      // 测试优化后的验证器
      const start2 = performance.now();
      for (let i = 0; i < iterations; i++) {
        validateAllSchemasUltra({ body: complexSchema }, { body: complexData });
      }
      const end2 = performance.now();
      const optimizedTime = end2 - start2;

      console.log("=== 复杂Schema验证性能对比 ===");
      console.log(`原来验证器: ${originalTime.toFixed(2)}ms (${iterations}次)`);
      console.log(
        `优化验证器: ${optimizedTime.toFixed(2)}ms (${iterations}次)`
      );
      console.log(`性能提升: ${(originalTime / optimizedTime).toFixed(2)}x`);
      console.log(`平均时间对比:`);
      console.log(`  原来: ${(originalTime / iterations).toFixed(6)}ms`);
      console.log(`  优化: ${(optimizedTime / iterations).toFixed(6)}ms`);

      expect(optimizedTime).toBeLessThan(originalTime);
    });
  });

  describe("缓存效果对比", () => {
    it("应该对比缓存效果", () => {
      const config: SchemaConfig = { body: userSchema };
      const data: RequestData = { body: validUser };

      // 测试原来的验证器（无缓存）
      const start1 = performance.now();
      for (let i = 0; i < 1000; i++) {
        validateSchemaConfig(config, data);
      }
      const end1 = performance.now();
      const originalTime = end1 - start1;

      // 测试优化后的验证器（有缓存）
      const start2 = performance.now();
      for (let i = 0; i < 1000; i++) {
        validateAllSchemasUltra(config, { body: validUser });
      }
      const end2 = performance.now();
      const optimizedTime = end2 - start2;

      console.log("=== 缓存效果对比 ===");
      console.log(`原来验证器（无缓存）: ${originalTime.toFixed(2)}ms`);
      console.log(`优化验证器（有缓存）: ${optimizedTime.toFixed(2)}ms`);
      console.log(
        `缓存带来的性能提升: ${(originalTime / optimizedTime).toFixed(2)}x`
      );

      expect(optimizedTime).toBeLessThan(originalTime);
    });
  });

  describe("内存使用对比", () => {
    it("应该对比内存使用情况", () => {
      const iterations = 1000;

      // 测试原来的验证器
      const start1 = performance.now();
      const originalErrors: Error[] = [];
      for (let i = 0; i < iterations; i++) {
        try {
          const config: SchemaConfig = { body: userSchema };
          const data: RequestData = { body: { invalid: "data" } };
          validateSchemaConfig(config, data);
        } catch (error) {
          originalErrors.push(error as Error);
        }
      }
      const end1 = performance.now();
      const originalTime = end1 - start1;

      // 测试优化后的验证器
      const start2 = performance.now();
      const optimizedErrors: Error[] = [];
      for (let i = 0; i < iterations; i++) {
        try {
          validateAllSchemasUltra(
            { body: userSchema },
            { body: { invalid: "data" } }
          );
        } catch (error) {
          optimizedErrors.push(error as Error);
        }
      }
      const end2 = performance.now();
      const optimizedTime = end2 - start2;

      console.log("=== 内存使用对比 ===");
      console.log(
        `原来验证器: ${originalTime.toFixed(2)}ms, 错误对象: ${
          originalErrors.length
        }`
      );
      console.log(
        `优化验证器: ${optimizedTime.toFixed(2)}ms, 错误对象: ${
          optimizedErrors.length
        }`
      );
      console.log(`性能提升: ${(originalTime / optimizedTime).toFixed(2)}x`);

      // 优化后的验证器应该更快，因为使用了内存池
      expect(optimizedTime).toBeLessThan(originalTime);
    });
  });
});
