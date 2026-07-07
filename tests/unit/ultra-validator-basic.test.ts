import { describe, it, expect } from "vitest";
import { Type } from "@sinclair/typebox";
import { validateSchemaOrThrow } from "../../src/utils/validators/validators";
import { isValidationFailedError } from "../../src/utils/validators/validation-errors";

describe("Schema 验证器基础功能测试", () => {
  it("应该验证简单的用户Schema", () => {
    const userSchema = Type.Object({
      id: Type.Number(),
      name: Type.String(),
      email: Type.String(),
      age: Type.Number(),
      isActive: Type.Boolean(),
    });

    const validUser = {
      id: 1,
      name: "张三",
      email: "zhangsan@example.com",
      age: 25,
      isActive: true,
    };

    const result = validateSchemaOrThrow(userSchema, validUser, "body");
    expect(result).toEqual(validUser);
  });

  it("应该验证查询参数Schema", () => {
    const querySchema = Type.Object({
      page: Type.Number({ minimum: 1 }),
      limit: Type.Number({ minimum: 1, maximum: 100 }),
    });

    const validQuery = {
      page: 1,
      limit: 20,
    };

    const result = validateSchemaOrThrow(querySchema, validQuery, "query");
    expect(result).toEqual(validQuery);
  });

  it("应该抛出验证错误", () => {
    const userSchema = Type.Object({
      id: Type.Number(),
      name: Type.String(),
    });

    const invalidUser = {
      id: "not-a-number", // 应该是数字
      name: 123, // 应该是字符串
    };

    try {
      validateSchemaOrThrow(userSchema, invalidUser, "body");
      expect.fail("应抛出 ValidationFailedError");
    } catch (err) {
      expect(isValidationFailedError(err)).toBe(true);
    }
  });
});
