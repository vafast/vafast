/**
 * Format 验证器测试
 */
import { describe, it, expect, beforeAll } from "vitest";
import { Type } from "@sinclair/typebox";
import { registerFormats, hasFormat, Patterns } from "../../src/utils/formats";
import { validateFast } from "../../src/utils/validators/validators";

beforeAll(() => {
  registerFormats();
});

describe("内置 Format 验证", () => {
  describe("字符串标识符", () => {
    it("email", () => {
      const schema = Type.String({ format: "email" });
      expect(validateFast(schema, "test@example.com")).toBe(true);
      expect(validateFast(schema, "user.name+tag@domain.co")).toBe(true);
      expect(validateFast(schema, "invalid")).toBe(false);
      expect(validateFast(schema, "@domain.com")).toBe(false);
    });

    it("uuid", () => {
      const schema = Type.String({ format: "uuid" });
      expect(validateFast(schema, "550e8400-e29b-41d4-a716-446655440000")).toBe(true);
      expect(validateFast(schema, "invalid-uuid")).toBe(false);
    });

    it("cuid", () => {
      const schema = Type.String({ format: "cuid" });
      expect(validateFast(schema, "cjld2cyuq0000t3rmniod1foy")).toBe(true);
      expect(validateFast(schema, "not-a-cuid")).toBe(false);
    });

    it("ulid", () => {
      const schema = Type.String({ format: "ulid" });
      expect(validateFast(schema, "01ARZ3NDEKTSV4RRFFQ69G5FAV")).toBe(true);
      expect(validateFast(schema, "invalid")).toBe(false);
    });

    it("nanoid", () => {
      const schema = Type.String({ format: "nanoid" });
      expect(validateFast(schema, "V1StGXR8_Z5jdHi6B-myT")).toBe(true);
      expect(validateFast(schema, "short")).toBe(false);
    });

    it("objectid", () => {
      const schema = Type.String({ format: "objectid" });
      expect(validateFast(schema, "507f1f77bcf86cd799439011")).toBe(true);
      expect(validateFast(schema, "invalid")).toBe(false);
    });

    it("slug", () => {
      const schema = Type.String({ format: "slug" });
      expect(validateFast(schema, "hello-world")).toBe(true);
      expect(validateFast(schema, "my-blog-post-123")).toBe(true);
      expect(validateFast(schema, "Hello-World")).toBe(false); // 大写
      expect(validateFast(schema, "hello_world")).toBe(false); // 下划线
    });
  });

  describe("网络相关", () => {
    it("url", () => {
      const schema = Type.String({ format: "url" });
      expect(validateFast(schema, "https://example.com")).toBe(true);
      expect(validateFast(schema, "http://sub.domain.com/path?q=1")).toBe(true);
      expect(validateFast(schema, "ftp://invalid")).toBe(false);
      expect(validateFast(schema, "not-a-url")).toBe(false);
    });

    it("ipv4", () => {
      const schema = Type.String({ format: "ipv4" });
      expect(validateFast(schema, "192.168.1.1")).toBe(true);
      expect(validateFast(schema, "255.255.255.255")).toBe(true);
      expect(validateFast(schema, "256.1.1.1")).toBe(false);
      expect(validateFast(schema, "1.2.3")).toBe(false);
    });

    it("ipv6", () => {
      const schema = Type.String({ format: "ipv6" });
      expect(validateFast(schema, "2001:0db8:85a3:0000:0000:8a2e:0370:7334")).toBe(true);
      expect(validateFast(schema, "::1")).toBe(true);
      expect(validateFast(schema, "invalid")).toBe(false);
    });

    it("ip (v4 或 v6)", () => {
      const schema = Type.String({ format: "ip" });
      expect(validateFast(schema, "192.168.1.1")).toBe(true);
      expect(validateFast(schema, "::1")).toBe(true);
    });

    it("cidr", () => {
      const schema = Type.String({ format: "cidr" });
      expect(validateFast(schema, "192.168.1.0/24")).toBe(true);
      expect(validateFast(schema, "10.0.0.0/8")).toBe(true);
      expect(validateFast(schema, "192.168.1.1")).toBe(false);
    });

    it("hostname", () => {
      const schema = Type.String({ format: "hostname" });
      expect(validateFast(schema, "example.com")).toBe(true);
      expect(validateFast(schema, "sub.domain.example.com")).toBe(true);
      expect(validateFast(schema, "-invalid.com")).toBe(false);
    });
  });

  describe("日期时间", () => {
    it("date", () => {
      const schema = Type.String({ format: "date" });
      expect(validateFast(schema, "2024-01-15")).toBe(true);
      expect(validateFast(schema, "2024-13-01")).toBe(false); // 无效月份
      expect(validateFast(schema, "01-15-2024")).toBe(false); // 错误格式
    });

    it("time", () => {
      const schema = Type.String({ format: "time" });
      expect(validateFast(schema, "14:30:00")).toBe(true);
      expect(validateFast(schema, "23:59:59.999")).toBe(true);
      expect(validateFast(schema, "25:00:00")).toBe(false);
    });

    it("date-time", () => {
      const schema = Type.String({ format: "date-time" });
      expect(validateFast(schema, "2024-01-15T14:30:00Z")).toBe(true);
      expect(validateFast(schema, "2024-01-15T14:30:00+08:00")).toBe(true);
      expect(validateFast(schema, "2024-01-15")).toBe(false);
    });

    it("duration", () => {
      const schema = Type.String({ format: "duration" });
      expect(validateFast(schema, "P1Y2M3D")).toBe(true);
      expect(validateFast(schema, "PT1H30M")).toBe(true);
      expect(validateFast(schema, "P1Y2M3DT4H5M6S")).toBe(true);
      expect(validateFast(schema, "invalid")).toBe(false);
    });
  });

  describe("手机号", () => {
    it("phone (中国大陆)", () => {
      const schema = Type.String({ format: "phone" });
      expect(validateFast(schema, "13812345678")).toBe(true);
      expect(validateFast(schema, "19912345678")).toBe(true);
      expect(validateFast(schema, "12345678901")).toBe(false);
      expect(validateFast(schema, "+8613812345678")).toBe(false);
    });

    it("phone-e164 (国际)", () => {
      const schema = Type.String({ format: "phone-e164" });
      expect(validateFast(schema, "+8613812345678")).toBe(true);
      expect(validateFast(schema, "+14155552671")).toBe(true);
      expect(validateFast(schema, "13812345678")).toBe(false);
    });
  });

  describe("编码格式", () => {
    it("base64", () => {
      const schema = Type.String({ format: "base64" });
      expect(validateFast(schema, "SGVsbG8gV29ybGQ=")).toBe(true);
      expect(validateFast(schema, "aGVsbG8=")).toBe(true);
      expect(validateFast(schema, "not base64!")).toBe(false);
    });

    it("jwt", () => {
      const schema = Type.String({ format: "jwt" });
      expect(validateFast(schema, "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.sig")).toBe(true);
      expect(validateFast(schema, "not.a.jwt!")).toBe(false);
      expect(validateFast(schema, "only.two")).toBe(false);
    });
  });

  describe("颜色", () => {
    it("hex-color", () => {
      const schema = Type.String({ format: "hex-color" });
      expect(validateFast(schema, "#fff")).toBe(true);
      expect(validateFast(schema, "#FF5733")).toBe(true);
      expect(validateFast(schema, "FF5733")).toBe(false);
      expect(validateFast(schema, "#GGGGGG")).toBe(false);
    });

    it("rgb-color", () => {
      const schema = Type.String({ format: "rgb-color" });
      expect(validateFast(schema, "rgb(255, 128, 0)")).toBe(true);
      expect(validateFast(schema, "rgba(255, 128, 0, 0.5)")).toBe(true);
      expect(validateFast(schema, "rgb(300, 0, 0)")).toBe(false);
    });
  });

  describe("其他", () => {
    it("semver", () => {
      const schema = Type.String({ format: "semver" });
      expect(validateFast(schema, "1.0.0")).toBe(true);
      expect(validateFast(schema, "2.1.3-beta.1")).toBe(true);
      expect(validateFast(schema, "1.0.0+build.123")).toBe(true);
      expect(validateFast(schema, "v1.0.0")).toBe(false);
      expect(validateFast(schema, "1.0")).toBe(false);
    });

    it("credit-card", () => {
      const schema = Type.String({ format: "credit-card" });
      expect(validateFast(schema, "4111111111111111")).toBe(true); // Visa 测试卡
      expect(validateFast(schema, "5500000000000004")).toBe(true); // MC 测试卡
      expect(validateFast(schema, "1234567890123456")).toBe(false); // 无效
    });
  });

  describe("hasFormat 检查", () => {
    it("应该检测已注册的 format", () => {
      expect(hasFormat("email")).toBe(true);
      expect(hasFormat("uuid")).toBe(true);
      expect(hasFormat("phone")).toBe(true);
      expect(hasFormat("non-existent")).toBe(false);
    });
  });

  describe("Patterns 导出", () => {
    it("应该导出常用正则", () => {
      expect(Patterns.EMAIL.test("test@example.com")).toBe(true);
      expect(Patterns.UUID.test("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
      expect(Patterns.IPV4.test("192.168.1.1")).toBe(true);
    });
  });
});

