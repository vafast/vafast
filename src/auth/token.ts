// src/auth/token.ts
import { base64urlEncode, base64urlDecode } from "../utils/base64url";

// 类型定义
export interface TokenPayload {
  [key: string]: any;
  exp?: number; // 过期时间戳
  iat?: number; // 签发时间戳
  sub?: string; // 主题（通常是用户ID）
  aud?: string; // 受众
  iss?: string; // 签发者
}

export interface TokenResult {
  payload: TokenPayload;
  token: string;
  expiresAt: number;
}

export interface TokenOptions {
  expiresIn?: number; // 过期时间（秒）
  issuer?: string; // 签发者
  audience?: string; // 受众
  subject?: string; // 主题
}

export class TokenError extends Error {
  constructor(
    message: string,
    public code:
      | "INVALID_TOKEN"
      | "EXPIRED_TOKEN"
      | "INVALID_SIGNATURE"
      | "MALFORMED_TOKEN"
      | "INVALID_PAYLOAD"
  ) {
    super(message);
    this.name = "TokenError";
  }
}

const encoder = new TextEncoder();

/** 使用 HMAC-SHA256 进行签名 */
async function sign(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return btoa(
    String.fromCharCode.apply(null, Array.from(new Uint8Array(signature)))
  );
}

/** 生成令牌 */
export async function generateToken(
  payload: TokenPayload,
  secret: string,
  options: TokenOptions = {}
): Promise<TokenResult> {
  const { expiresIn = 3600, issuer, audience, subject } = options;

  // 创建令牌载荷，强制使用当前时间
  const now = Math.floor(Date.now() / 1000);
  const tokenPayload: TokenPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn,
  };

  // 添加可选字段
  if (issuer) tokenPayload.iss = issuer;
  if (audience) tokenPayload.aud = audience;
  if (subject) tokenPayload.sub = subject;

  const data = base64urlEncode(JSON.stringify(tokenPayload));
  const sig = await sign(data, secret);
  const token = `${data}.${base64urlEncode(sig)}`;

  return {
    payload: tokenPayload,
    token,
    expiresAt: tokenPayload.exp! * 1000, // 转换为毫秒
  };
}

/** 验证令牌 */
export async function verifyToken(
  token: string,
  secret: string
): Promise<TokenPayload | null> {
  try {
    const [data, sig] = token.split(".");
    if (!data || !sig) {
      throw new TokenError("令牌格式无效", "MALFORMED_TOKEN");
    }

    const expectedSig = await sign(data, secret);
    const expected = base64urlEncode(expectedSig);

    if (sig !== expected) {
      throw new TokenError("令牌签名无效", "INVALID_SIGNATURE");
    }

    const payload = JSON.parse(base64urlDecode(data)) as TokenPayload;

    // 检查过期时间
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      throw new TokenError("令牌已过期", "EXPIRED_TOKEN");
    }

    return payload;
  } catch (error) {
    if (error instanceof TokenError) {
      throw error;
    }
    throw new TokenError("令牌验证失败", "INVALID_TOKEN");
  }
}

/** 解析令牌（不验证签名） */
export function parseToken(token: string): TokenPayload | null {
  try {
    const [data] = token.split(".");
    if (!data) return null;

    return JSON.parse(base64urlDecode(data));
  } catch {
    return null;
  }
}

/** 检查令牌是否过期 */
export function isTokenExpired(token: string): boolean {
  const payload = parseToken(token);
  if (!payload || !payload.exp) return true;

  return Date.now() / 1000 > payload.exp;
}

/** 获取令牌剩余有效时间（秒） */
export function getTokenTimeRemaining(token: string): number {
  const payload = parseToken(token);
  if (!payload || !payload.exp) return 0;

  const remaining = payload.exp - Date.now() / 1000;
  return Math.max(0, Math.floor(remaining));
}

/** 刷新令牌 */
export async function refreshToken(
  token: string,
  secret: string,
  options: TokenOptions = {}
): Promise<TokenResult | null> {
  try {
    const payload = await verifyToken(token, secret);
    if (!payload) return null;

    // 移除时间相关字段，重新生成
    const { exp, iat, ...cleanPayload } = payload;

    // 添加延迟确保时间戳不同
    await new Promise((resolve) => setTimeout(resolve, 10));

    return await generateToken(cleanPayload, secret, options);
  } catch {
    return null;
  }
}

/** 创建访问令牌和刷新令牌对 */
export async function createTokenPair(
  payload: TokenPayload,
  secret: string,
  options: TokenOptions = {}
): Promise<{
  accessToken: TokenResult;
  refreshToken: TokenResult;
}> {
  const accessToken = await generateToken(payload, secret, {
    ...options,
    expiresIn: options.expiresIn || 3600, // 1小时
  });

  const refreshToken = await generateToken(payload, secret, {
    ...options,
    expiresIn: 7 * 24 * 3600, // 7天
  });

  return { accessToken, refreshToken };
}
