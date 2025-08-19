import { describe, it, expect } from "bun:test";
import { Type } from "@sinclair/typebox";
import {
  validateSchema,
  ValidationResult,
  ValidationError,
} from "../src/utils/validators/validators";

describe("数据验证函数测试", () => {
  describe("基础验证功能", () => {
    it("应该验证简单的字符串Schema", () => {
      const schema = Type.String();
      const result = validateSchema(schema, "hello");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("hello");
      }
    });

    it("应该验证数字Schema", () => {
      const schema = Type.Number();
      const result = validateSchema(schema, 42);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(42);
      }
    });

    it("应该验证布尔值Schema", () => {
      const schema = Type.Boolean();
      const result = validateSchema(schema, true);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(true);
      }
    });

    it("应该验证数组Schema", () => {
      const schema = Type.Array(Type.String());
      const data = ["hello", "world"];
      const result = validateSchema(schema, data);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(data);
      }
    });
  });

  describe("对象验证功能", () => {
    it("应该验证复杂对象Schema", () => {
      const UserSchema = Type.Object({
        id: Type.Number(),
        name: Type.String(),
        email: Type.String(),
        age: Type.Optional(Type.Number({ minimum: 0, maximum: 150 })),
        tags: Type.Array(Type.String()),
      });

      const userData = {
        id: 1,
        name: "张三",
        email: "zhangsan@example.com",
        age: 25,
        tags: ["developer", "typescript"],
      };

      const result = validateSchema(UserSchema, userData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(userData);
        // TypeScript应该能推断出result.data的类型
        expect(result.data.id).toBe(1);
        expect(result.data.name).toBe("张三");
        expect(result.data.email).toBe("zhangsan@example.com");
        expect(result.data.age).toBe(25);
        expect(result.data.tags).toEqual(["developer", "typescript"]);
      }
    });

    it("应该验证嵌套对象Schema", () => {
      const AddressSchema = Type.Object({
        street: Type.String(),
        city: Type.String(),
        country: Type.String(),
      });

      const PersonSchema = Type.Object({
        name: Type.String(),
        address: AddressSchema,
        contacts: Type.Array(
          Type.Object({
            type: Type.Union([Type.Literal("email"), Type.Literal("phone")]),
            value: Type.String(),
          })
        ),
      });

      const personData = {
        name: "李四",
        address: {
          street: "中关村大街1号",
          city: "北京",
          country: "中国",
        },
        contacts: [
          { type: "email" as const, value: "lisi@example.com" },
          { type: "phone" as const, value: "13800138000" },
        ],
      };

      const result = validateSchema(PersonSchema, personData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(personData);
      }
    });
  });

  describe("验证失败场景", () => {
    it("应该在类型不匹配时返回错误", () => {
      const schema = Type.String();
      const result = validateSchema(schema, 42);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toBeDefined();
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });

    it("应该在缺少必需字段时返回错误", () => {
      const schema = Type.Object({
        name: Type.String(),
        email: Type.String(),
      });

      const invalidData = { name: "王五" }; // 缺少email字段
      const result = validateSchema(schema, invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toBeDefined();
      }
    });

    it("应该在数组元素类型不匹配时返回错误", () => {
      const schema = Type.Array(Type.Number());
      const invalidData = [1, "two", 3]; // 第二个元素是字符串
      const result = validateSchema(schema, invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toBeDefined();
      }
    });
  });

  describe("边界情况测试", () => {
    it("应该处理null数据", () => {
      const schema = Type.String();
      const result = validateSchema(schema, null);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toBeDefined();
      }
    });

    it("应该处理undefined数据", () => {
      const schema = Type.String();
      const result = validateSchema(schema, undefined);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toBeDefined();
      }
    });

    it("应该处理空对象", () => {
      const schema = Type.Object({});
      const result = validateSchema(schema, {});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({});
      }
    });

    it("应该处理空数组", () => {
      const schema = Type.Array(Type.String());
      const result = validateSchema(schema, []);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
      }
    });
  });

  describe("类型安全测试", () => {
    it("应该提供完整的类型推断", () => {
      const UserSchema = Type.Object({
        id: Type.Number(),
        name: Type.String(),
        isActive: Type.Boolean(),
      });

      // 验证类型推断
      type User = typeof UserSchema;
      type UserData = import("../src/utils/validators/validators").Static<User>;

      const userData: UserData = {
        id: 1,
        name: "测试用户",
        isActive: true,
      };

      const result = validateSchema(UserSchema, userData);

      if (result.success) {
        // TypeScript应该能推断出完整的类型
        expect(result.data.id).toBe(1);
        expect(result.data.name).toBe("测试用户");
        expect(result.data.isActive).toBe(true);
      }
    });
  });
});
