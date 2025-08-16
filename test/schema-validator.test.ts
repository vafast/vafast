/**
 * Schema验证器测试文件
 * 
 * 测试validateSchemaConfig和相关函数的功能
 */

import { describe, it, expect } from "bun:test";
import { Type } from "@sinclair/typebox";
import {
  validateSchemaConfig,
  validateSchemaConfigAsync,
  createSchemaValidator,
  type SchemaConfig,
  type RequestData,
} from "../src/utils/schema-validator";

// 测试用的Schema定义
const testUserSchema = Type.Object({
  id: Type.Number(),
  name: Type.String({ minLength: 1 }),
  email: Type.String({ pattern: "^[^@]+@[^@]+\\.[^@]+$" }),
});

const testQuerySchema = Type.Object({
  page: Type.Number({ minimum: 1 }),
  limit: Type.Number({ minimum: 1, maximum: 100 }),
});

const testParamsSchema = Type.Object({
  userId: Type.String({ pattern: "^[0-9]+$" }),
});

const testHeadersSchema = Type.Object({
  authorization: Type.String({ pattern: "^Bearer .*" }),
});

const testCookiesSchema = Type.Object({
  sessionId: Type.String(),
});

describe("Schema验证器", () => {
  describe("validateSchemaConfig", () => {
    it("应该成功验证有效数据", () => {
      const config: SchemaConfig = {
        body: testUserSchema,
        query: testQuerySchema,
      };

      const data: RequestData = {
        body: {
          id: 1,
          name: "张三",
          email: "zhangsan@example.com",
        },
        query: {
          page: 1,
          limit: 20,
        },
      };

      const result = validateSchemaConfig(config, data);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.body).toEqual(data.body);
      expect(result.data?.query).toEqual(data.query);
    });

    it("应该失败验证无效数据", () => {
      const config: SchemaConfig = {
        body: testUserSchema,
      };

      const data: RequestData = {
        body: {
          id: "invalid_id", // 应该是数字
          name: "", // 空字符串，违反minLength
          email: "invalid-email", // 无效邮箱格式
        },
      };

      const result = validateSchemaConfig(config, data);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
      expect(result.errors?.[0].field).toBe("body");
    });

    it("应该跳过未配置的字段验证", () => {
      const config: SchemaConfig = {
        body: testUserSchema,
        // 没有配置query
      };

      const data: RequestData = {
        body: {
          id: 1,
          name: "李四",
          email: "lisi@example.com",
        },
        query: {
          page: 0, // 这个不会被验证
          limit: 200, // 这个不会被验证
        },
      };

      const result = validateSchemaConfig(config, data);

      expect(result.success).toBe(true);
      expect(result.data?.body).toEqual(data.body);
      expect(result.data?.query).toEqual(data.query); // 应该保留原始值
    });

    it("应该处理undefined字段", () => {
      const config: SchemaConfig = {
        body: testUserSchema,
        query: testQuerySchema,
      };

      const data: RequestData = {
        body: {
          id: 1,
          name: "王五",
          email: "wangwu@example.com",
        },
        // query未定义
      };

      const result = validateSchemaConfig(config, data);

      expect(result.success).toBe(true);
      expect(result.data?.body).toEqual(data.body);
      expect(result.data?.query).toBeUndefined();
    });
  });

  describe("validateSchemaConfigAsync", () => {
    it("应该异步验证数据", async () => {
      const config: SchemaConfig = {
        body: testUserSchema,
        params: testParamsSchema,
      };

      const data: RequestData = {
        body: {
          id: 2,
          name: "赵六",
          email: "zhaoliu@example.com",
        },
        params: {
          userId: "123",
        },
      };

      const result = await validateSchemaConfigAsync(config, data);

      expect(result.success).toBe(true);
      expect(result.data?.body).toEqual(data.body);
      expect(result.data?.params).toEqual(data.params);
    });

    it("应该处理异步验证错误", async () => {
      const config: SchemaConfig = {
        body: testUserSchema,
        headers: testHeadersSchema,
      };

      const data: RequestData = {
        body: {
          id: 3,
          name: "孙七",
          email: "sunqi@example.com",
        },
        headers: {
          authorization: "InvalidToken", // 违反pattern
        },
      };

      const result = await validateSchemaConfigAsync(config, data);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
      expect(result.errors?.[0].field).toBe("headers");
    });
  });

  describe("createSchemaValidator", () => {
    it("应该创建可重用的验证器", () => {
      const config: SchemaConfig = {
        body: testUserSchema,
        cookies: testCookiesSchema,
      };

      const validator = createSchemaValidator(config);

      const data1: RequestData = {
        body: {
          id: 4,
          name: "周八",
          email: "zhouba@example.com",
        },
        cookies: {
          sessionId: "sess_123",
        },
      };

      const data2: RequestData = {
        body: {
          id: 5,
          name: "吴九",
          email: "wujiu@example.com",
        },
        cookies: {
          sessionId: "sess_456",
        },
      };

      const result1 = validator(data1);
      const result2 = validator(data2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.data?.body).toEqual(data1.body);
      expect(result2.data?.body).toEqual(data2.body);
    });

    it("应该验证部分配置", () => {
      const config: SchemaConfig = {
        body: testUserSchema,
        // 只验证body
      };

      const validator = createSchemaValidator(config);

      const data: RequestData = {
        body: {
          id: 6,
          name: "郑十",
          email: "zhengshi@example.com",
        },
        query: {
          page: 0, // 这个不会被验证
          limit: 200, // 这个不会被验证
        },
      };

      const result = validator(data);

      expect(result.success).toBe(true);
      expect(result.data?.body).toEqual(data.body);
      expect(result.data?.query).toEqual(data.query); // 应该保留原始值
    });
  });

  describe("边界情况", () => {
    it("应该处理空配置", () => {
      const config: SchemaConfig = {};

      const data: RequestData = {
        body: { any: "data" },
        query: { any: "query" },
      };

      const result = validateSchemaConfig(config, data);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
    });

    it("应该处理空数据", () => {
      const config: SchemaConfig = {
        body: testUserSchema,
      };

      const data: RequestData = {};

      const result = validateSchemaConfig(config, data);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
    });

    it("应该处理复杂的嵌套Schema", () => {
      const complexSchema = Type.Object({
        user: Type.Object({
          profile: Type.Object({
            personal: Type.Object({
              firstName: Type.String(),
              lastName: Type.String(),
            }),
            preferences: Type.Array(Type.String()),
          }),
        }),
        metadata: Type.Object({
          tags: Type.Array(Type.String()),
          createdAt: Type.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$" }),
        }),
      });

      const config: SchemaConfig = {
        body: complexSchema,
      };

      const data: RequestData = {
        body: {
          user: {
            profile: {
              personal: {
                firstName: "张",
                lastName: "三",
              },
              preferences: ["中文", "编程"],
            },
          },
          metadata: {
            tags: ["用户", "测试"],
            createdAt: "2024-01-01T00:00:00Z",
          },
        },
      };

      const result = validateSchemaConfig(config, data);

      expect(result.success).toBe(true);
      expect(result.data?.body).toEqual(data.body);
    });
  });
});
