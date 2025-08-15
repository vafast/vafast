// src/auth/token.ts
import { base64urlEncode, base64urlDecode } from "../utils/base64url";



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
  return btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(signature))));
}

/** 生成令牌 */
// 变更点：btoa → base64urlEncode、atob → base64urlDecode 替换
export async function generateToken(payload: Record<string, any>, secret: string): Promise<string> {
  const data = base64urlEncode(JSON.stringify(payload));
  const sig = await sign(data, secret);
  return `${data}.${base64urlEncode(sig)}`; // ✅ 两者都URL安全
}


export async function verifyToken(token: string, secret: string): Promise<Record<string, any> | null> {
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;

  const expectedSig = await sign(data, secret);
  const expected = base64urlEncode(expectedSig);

  if (sig !== expected) return null;

  try {
    return JSON.parse(base64urlDecode(data));
  } catch {
    return null;
  }
}
