import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Type } from "@sinclair/typebox";
import {
  validateSchemaUltra,
  clearUltraCache,
} from "../../src/utils/validators/schema-validators-ultra";

describe("超高性能验证器基础功能测试", () => {
  beforeEach(() => {
    clearUltraCache();
  });

  afterEach(() => {
    clearUltraCache();
  });

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

    const result = validateSchemaUltra(userSchema, validUser, "用户数据");
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

    const result = validateSchemaUltra(querySchema, validQuery, "查询参数");
    expect(result).toEqual(validQuery);
  });

  it("应该跳过未定义的Schema", () => {
    const data = { test: "data" };
    const result = validateSchemaUltra(undefined, data, "测试");
    expect(result).toEqual(data);
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

    expect(() => {
      validateSchemaUltra(userSchema, invalidUser, "用户数据");
    }).toThrow("用户数据验证失败");
  });
});
