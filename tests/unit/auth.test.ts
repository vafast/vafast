import { describe, it, expect, beforeEach } from "vitest";
import {
  generateToken,
  verifyToken,
  parseToken,
  isTokenExpired,
  getTokenTimeRemaining,
  refreshToken,
  createTokenPair,
  TokenError,
  type TokenPayload,
  type TokenOptions,
} from "../../src/auth/token";

describe("认证令牌模块", () => {
  const secret = "test-secret-key";
  const testPayload: TokenPayload = {
    userId: "123",
    username: "testuser",
    role: "user",
    permissions: ["read", "write"],
  };

  describe("generateToken", () => {
    it("应该生成有效的令牌", async () => {
      const result = await generateToken(testPayload, secret);

      expect(result).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.payload).toBeDefined();
      expect(result.expiresAt).toBeGreaterThan(Date.now());
      expect(result.payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
      expect(result.payload.iat).toBeLessThanOrEqual(
        Math.floor(Date.now() / 1000)
      );
    });

    it("应该使用自定义过期时间", async () => {
      const options: TokenOptions = { expiresIn: 7200 }; // 2小时
      const result = await generateToken(testPayload, secret, options);

      expect(result.payload.exp! - result.payload.iat!).toBe(7200);
    });

    it("应该添加签发者、受众和主题信息", async () => {
      const options: TokenOptions = {
        issuer: "vafast",
        audience: "api",
        subject: "user123",
      };
      const result = await generateToken(testPayload, secret, options);

      expect(result.payload.iss).toBe("vafast");
      expect(result.payload.aud).toBe("api");
      expect(result.payload.sub).toBe("user123");
    });
  });

  describe("verifyToken", () => {
    let validToken: string;

    beforeEach(async () => {
      const result = await generateToken(testPayload, secret);
      validToken = result.token;
    });

    it("应该验证有效令牌", async () => {
      const payload = await verifyToken(validToken, secret);

      expect(payload).toBeDefined();
      expect(payload!.userId).toBe("123");
      expect(payload!.username).toBe("testuser");
    });

    it("应该拒绝无效签名的令牌", async () => {
      const invalidToken = validToken.replace(/[a-zA-Z0-9_-]+$/, "invalid");

      await expect(verifyToken(invalidToken, secret)).rejects.toThrow(
        TokenError
      );
    });

    it("应该拒绝格式错误的令牌", async () => {
      const malformedToken = "invalid-token-format";

      await expect(verifyToken(malformedToken, secret)).rejects.toThrow(
        TokenError
      );
    });

    it("应该拒绝错误的密钥", async () => {
      const wrongSecret = "wrong-secret";

      await expect(verifyToken(validToken, wrongSecret)).rejects.toThrow(
        TokenError
      );
    });
  });

  describe("parseToken", () => {
    let validToken: string;

    beforeEach(async () => {
      const result = await generateToken(testPayload, secret);
      validToken = result.token;
    });

    it("应该解析令牌载荷", () => {
      const payload = parseToken(validToken);

      expect(payload).toBeDefined();
      expect(payload!.userId).toBe("123");
      expect(payload!.username).toBe("testuser");
    });

    it("应该处理无效令牌格式", () => {
      const payload = parseToken("invalid-token");
      expect(payload).toBeNull();
    });

    it("应该处理空令牌", () => {
      const payload = parseToken("");
      expect(payload).toBeNull();
    });
  });

  describe("isTokenExpired", () => {
    it("应该检测过期令牌", async () => {
      // 创建一个已经过期的载荷
      const expiredPayload = {
        ...testPayload,
        iat: Math.floor(Date.now() / 1000) - 7200, // 2小时前签发
        exp: Math.floor(Date.now() / 1000) - 3600, // 1小时前过期
      };

      // 手动构造过期令牌（不通过generateToken，因为它会自动设置当前时间）
      const data = JSON.stringify(expiredPayload);
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const signature = await crypto.subtle.sign(
        "HMAC",
        key,
        encoder.encode(data)
      );
      const sig = btoa(
        String.fromCharCode.apply(null, Array.from(new Uint8Array(signature)))
      );
      const expiredToken = `${data}.${sig}`;

      expect(isTokenExpired(expiredToken)).toBe(true);
    });

    it("应该检测有效令牌", async () => {
      const result = await generateToken(testPayload, secret);
      expect(isTokenExpired(result.token)).toBe(false);
    });

    it("应该处理没有过期时间的令牌", () => {
      expect(isTokenExpired("token.without.exp")).toBe(true);
    });
  });

  describe("getTokenTimeRemaining", () => {
    it("应该计算剩余时间", async () => {
      const options: TokenOptions = { expiresIn: 3600 }; // 1小时
      const result = await generateToken(testPayload, secret, options);

      const remaining = getTokenTimeRemaining(result.token);
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(3600);
    });

    it("应该返回0对于过期令牌", async () => {
      // 创建一个已经过期的载荷
      const expiredPayload = {
        ...testPayload,
        iat: Math.floor(Date.now() / 1000) - 7200, // 2小时前签发
        exp: Math.floor(Date.now() / 1000) - 3600, // 1小时前过期
      };

      // 手动构造过期令牌
      const data = JSON.stringify(expiredPayload);
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const signature = await crypto.subtle.sign(
        "HMAC",
        key,
        encoder.encode(data)
      );
      const sig = btoa(
        String.fromCharCode.apply(null, Array.from(new Uint8Array(signature)))
      );
      const expiredToken = `${data}.${sig}`;

      expect(getTokenTimeRemaining(expiredToken)).toBe(0);
    });
  });

  describe("refreshToken", () => {
    let validToken: string;

    beforeEach(async () => {
      const result = await generateToken(testPayload, secret);
      validToken = result.token;
    });

    it("应该刷新有效令牌", async () => {
      const newToken = await refreshToken(validToken, secret);

      expect(newToken).toBeDefined();
      expect(newToken!.token).toBeDefined();
      expect(newToken!.payload.userId).toBe("123");

      // 验证刷新后的令牌是有效的
      const verifiedNewToken = await verifyToken(newToken!.token, secret);
      expect(verifiedNewToken).toBeDefined();
      expect(verifiedNewToken!.userId).toBe("123");

      // 验证两个令牌都包含相同的基本信息
      const originalPayload = parseToken(validToken);
      const newPayload = parseToken(newToken!.token);

      expect(originalPayload!.userId).toBe(newPayload!.userId);
      expect(originalPayload!.username).toBe(newPayload!.username);
      expect(originalPayload!.role).toBe(newPayload!.role);
    });

    it("应该使用自定义选项刷新", async () => {
      const options: TokenOptions = { expiresIn: 7200 };
      const newToken = await refreshToken(validToken, secret, options);

      expect(newToken!.payload.exp! - newToken!.payload.iat!).toBe(7200);
    });

    it("应该拒绝无效令牌的刷新", async () => {
      const invalidToken = "invalid.token";
      const newToken = await refreshToken(invalidToken, secret);

      expect(newToken).toBeNull();
    });
  });

  describe("createTokenPair", () => {
    it("应该创建访问令牌和刷新令牌对", async () => {
      const tokenPair = await createTokenPair(testPayload, secret);

      expect(tokenPair.accessToken).toBeDefined();
      expect(tokenPair.refreshToken).toBeDefined();
      expect(tokenPair.accessToken.token).not.toBe(
        tokenPair.refreshToken.token
      );

      // 访问令牌应该较短
      const accessExp =
        tokenPair.accessToken.payload.exp! - tokenPair.accessToken.payload.iat!;
      const refreshExp =
        tokenPair.refreshToken.payload.exp! -
        tokenPair.refreshToken.payload.iat!;

      expect(accessExp).toBeLessThan(refreshExp);
    });

    it("应该使用自定义过期时间", async () => {
      const options: TokenOptions = { expiresIn: 1800 }; // 30分钟
      const tokenPair = await createTokenPair(testPayload, secret, options);

      const accessExp =
        tokenPair.accessToken.payload.exp! - tokenPair.accessToken.payload.iat!;
      expect(accessExp).toBe(1800);
    });
  });

  describe("TokenError", () => {
    it("应该创建正确的错误类型", () => {
      const error = new TokenError("测试错误", "INVALID_TOKEN");

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(TokenError);
      expect(error.name).toBe("TokenError");
      expect(error.message).toBe("测试错误");
      expect(error.code).toBe("INVALID_TOKEN");
    });

    it("应该支持所有错误代码", () => {
      const codes = [
        "INVALID_TOKEN",
        "EXPIRED_TOKEN",
        "INVALID_SIGNATURE",
        "MALFORMED_TOKEN",
        "INVALID_PAYLOAD",
      ];

      codes.forEach((code) => {
        const error = new TokenError("测试", code as any);
        expect(error.code).toBe(code);
      });
    });
  });

  describe("集成测试", () => {
    it("应该完成完整的令牌生命周期", async () => {
      // 1. 生成令牌
      const result = await generateToken(testPayload, secret);
      expect(result.token).toBeDefined();

      // 2. 验证令牌
      const verifiedPayload = await verifyToken(result.token, secret);
      expect(verifiedPayload!.userId).toBe("123");

      // 3. 检查未过期
      expect(isTokenExpired(result.token)).toBe(false);

      // 4. 获取剩余时间
      const remaining = getTokenTimeRemaining(result.token);
      expect(remaining).toBeGreaterThan(0);

      // 5. 刷新令牌
      const refreshed = await refreshToken(result.token, secret);
      expect(refreshed!.token).toBeDefined();
      expect(refreshed!.payload.userId).toBe("123");

      // 6. 验证刷新后的令牌
      const newVerified = await verifyToken(refreshed!.token, secret);
      expect(newVerified!.userId).toBe("123");

      // 7. 验证刷新后的令牌包含正确的信息
      expect(newVerified!.username).toBe("testuser");
      expect(newVerified!.role).toBe("user");
    });
  });
});
