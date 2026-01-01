/**
 * 优化后的验证器测试
 * 测试缓存机制和性能
 */

import { describe, it, expect, beforeEach } from "vitest";
import { Type } from "@sinclair/typebox";
import {
  validateSchema,
  createValidator,
  validateFast,
  precompileSchemas,
  getValidatorCacheStats,
} from "../../src/utils/validators/validators";

describe("优化后的验证器测试", () => {
  // 测试用的 Schema
  const UserSchema = Type.Object({
    id: Type.Number(),
    name: Type.String(),
    email: Type.String(),
    age: Type.Optional(Type.Number({ minimum: 0, maximum: 150 })),
  });

  const ProductSchema = Type.Object({
    sku: Type.String(),
    price: Type.Number({ minimum: 0 }),
    quantity: Type.Integer({ minimum: 0 }),
  });

  describe("validateSchema - 基础功能", () => {
    it("应该验证有效数据", () => {
      const result = validateSchema(UserSchema, {
        id: 1,
        name: "张三",
        email: "zhangsan@example.com",
        age: 25,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(1);
        expect(result.data.name).toBe("张三");
      }
    });

    it("应该拒绝无效数据", () => {
      const result = validateSchema(UserSchema, {
        id: "not-a-number",
        name: "张三",
        email: "zhangsan@example.com",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });

    it("应该返回详细的错误信息", () => {
      const result = validateSchema(UserSchema, {
        id: 1,
        name: 123, // 应该是字符串
        email: "test@test.com",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const nameError = result.errors.find((e) => e.path.includes("name"));
        expect(nameError).toBeDefined();
      }
    });
  });

  describe("createValidator - 类型特化验证器", () => {
    it("应该创建可重用的验证器", () => {
      const validateUser = createValidator(UserSchema);

      const result1 = validateUser({ id: 1, name: "A", email: "a@a.com" });
      const result2 = validateUser({ id: 2, name: "B", email: "b@b.com" });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });

    it("特化验证器应该返回正确的错误", () => {
      const validateUser = createValidator(UserSchema);
      const result = validateUser({ id: "invalid" });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe("validateFast - 快速验证", () => {
    it("应该快速返回 true 对于有效数据", () => {
      const isValid = validateFast(UserSchema, {
        id: 1,
        name: "张三",
        email: "test@test.com",
      });

      expect(isValid).toBe(true);
    });

    it("应该快速返回 false 对于无效数据", () => {
      const isValid = validateFast(UserSchema, {
        id: "not-a-number",
      });

      expect(isValid).toBe(false);
    });

    it("应该作为类型守卫工作", () => {
      const data: unknown = { id: 1, name: "测试", email: "test@test.com" };

      if (validateFast(UserSchema, data)) {
        // TypeScript 应该能推断出 data 的类型
        expect(data.id).toBe(1);
        expect(data.name).toBe("测试");
      }
    });
  });

  describe("precompileSchemas - 预编译", () => {
    it("应该预编译多个 Schema", () => {
      // 不应该抛出错误
      expect(() => {
        precompileSchemas([UserSchema, ProductSchema]);
      }).not.toThrow();
    });

    it("预编译后的验证应该正常工作", () => {
      precompileSchemas([UserSchema]);

      const result = validateSchema(UserSchema, {
        id: 1,
        name: "预编译测试",
        email: "test@test.com",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("缓存机制测试", () => {
    it("多次验证同一 Schema 应该使用缓存", () => {
      // 验证多次
      for (let i = 0; i < 100; i++) {
        const result = validateSchema(UserSchema, {
          id: i,
          name: `User${i}`,
          email: `user${i}@test.com`,
        });
        expect(result.success).toBe(true);
      }
    });

    it("getValidatorCacheStats 应该返回缓存信息", () => {
      const stats = getValidatorCacheStats();
      expect(stats.cacheType).toBe("WeakMap");
    });
  });

  describe("性能基准测试", () => {
    const iterations = 10000;

    it(`validateSchema: ${iterations} 次验证应该在合理时间内完成`, () => {
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        validateSchema(UserSchema, {
          id: i,
          name: `User${i}`,
          email: `user${i}@test.com`,
        });
      }

      const duration = performance.now() - start;
      console.log(
        `validateSchema: ${iterations} 次验证耗时 ${duration.toFixed(2)}ms`,
      );
      console.log(`平均每次: ${(duration / iterations).toFixed(4)}ms`);

      // 期望 10000 次验证在 500ms 内完成
      expect(duration).toBeLessThan(500);
    });

    it(`createValidator: ${iterations} 次验证应该更快`, () => {
      const validateUser = createValidator(UserSchema);
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        validateUser({
          id: i,
          name: `User${i}`,
          email: `user${i}@test.com`,
        });
      }

      const duration = performance.now() - start;
      console.log(
        `createValidator: ${iterations} 次验证耗时 ${duration.toFixed(2)}ms`,
      );
      console.log(`平均每次: ${(duration / iterations).toFixed(4)}ms`);

      // 期望更快
      expect(duration).toBeLessThan(500);
    });

    it(`validateFast: ${iterations} 次验证应该最快`, () => {
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        validateFast(UserSchema, {
          id: i,
          name: `User${i}`,
          email: `user${i}@test.com`,
        });
      }

      const duration = performance.now() - start;
      console.log(
        `validateFast: ${iterations} 次验证耗时 ${duration.toFixed(2)}ms`,
      );
      console.log(`平均每次: ${(duration / iterations).toFixed(4)}ms`);

      // 期望最快
      expect(duration).toBeLessThan(300);
    });
  });
});
