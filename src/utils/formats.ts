/**
 * TypeBox Format 验证器
 *
 * 内置常用的 format 验证，对标 Zod 的内置验证
 * 框架启动时自动注册
 *
 * @version 1.0.0
 */

import { FormatRegistry } from "@sinclair/typebox";

// ============== 正则表达式 ==============

// 邮箱 (RFC 5322 简化版)
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// UUID v4
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// UUID 任意版本
const UUID_ANY_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// CUID
const CUID_REGEX = /^c[^\s-]{8,}$/i;

// CUID2
const CUID2_REGEX = /^[0-9a-z]+$/;

// ULID
const ULID_REGEX = /^[0-9A-HJKMNP-TV-Z]{26}$/i;

// NanoID (默认 21 字符)
const NANOID_REGEX = /^[A-Za-z0-9_-]{21}$/;

// URL
const URL_REGEX = /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b[-a-zA-Z0-9()@:%_+.~#?&/=]*$/;

// IPv4
const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

// IPv6 (简化版)
const IPV6_REGEX = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,7}:$|^(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}$|^(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}$|^(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}$/;

// CIDR (IPv4)
const CIDR_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(?:3[0-2]|[12]?[0-9])$/;

// 日期 (YYYY-MM-DD)
const DATE_REGEX = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12][0-9]|3[01])$/;

// 时间 (HH:mm:ss 或 HH:mm:ss.SSS)
const TIME_REGEX = /^(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.\d{1,3})?$/;

// ISO 日期时间
const DATE_TIME_REGEX = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12][0-9]|3[01])T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.\d{1,3})?(?:Z|[+-](?:[01][0-9]|2[0-3]):[0-5][0-9])?$/;

// ISO 8601 Duration (P1Y2M3DT4H5M6S)
const DURATION_REGEX = /^P(?:\d+Y)?(?:\d+M)?(?:\d+W)?(?:\d+D)?(?:T(?:\d+H)?(?:\d+M)?(?:\d+(?:\.\d+)?S)?)?$/;

// Hostname (RFC 1123)
const HOSTNAME_REGEX = /^(?=.{1,253}$)(?:(?!-)[a-zA-Z0-9-]{1,63}(?<!-)\.)*(?!-)[a-zA-Z0-9-]{1,63}(?<!-)$/;

// 手机号 (中国大陆)
const PHONE_CN_REGEX = /^1[3-9]\d{9}$/;

// 手机号 (国际格式 E.164)
const PHONE_E164_REGEX = /^\+[1-9]\d{6,14}$/;

// MongoDB ObjectId
const OBJECTID_REGEX = /^[0-9a-fA-F]{24}$/;

// 十六进制颜色
const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

// RGB/RGBA 颜色
const RGB_COLOR_REGEX = /^rgba?\(\s*(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\s*,\s*(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\s*,\s*(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/;

// Base64
const BASE64_REGEX = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

// Base64 URL Safe
const BASE64URL_REGEX = /^[A-Za-z0-9_-]+$/;

// JWT (3 部分 base64url)
const JWT_REGEX = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

// Emoji (简化检测)
const EMOJI_REGEX = /^[\p{Emoji}]+$/u;

// Slug (URL 友好字符串)
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Semver (语义化版本)
const SEMVER_REGEX = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

// 信用卡号 (Luhn 算法验证)
function isValidCreditCard(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return false;

  let sum = 0;
  let isEven = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i], 10);
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    isEven = !isEven;
  }
  return sum % 10 === 0;
}

// ============== Format 注册 ==============

let isRegistered = false;

/**
 * 注册所有内置 format 验证器
 * 框架自动调用，也可手动调用
 */
export function registerFormats(): void {
  if (isRegistered) return;
  isRegistered = true;

  // === 字符串标识符 ===
  FormatRegistry.Set("email", (v) => EMAIL_REGEX.test(v));
  FormatRegistry.Set("uuid", (v) => UUID_REGEX.test(v));
  FormatRegistry.Set("uuid-any", (v) => UUID_ANY_REGEX.test(v));
  FormatRegistry.Set("cuid", (v) => CUID_REGEX.test(v));
  FormatRegistry.Set("cuid2", (v) => CUID2_REGEX.test(v) && v.length >= 1);
  FormatRegistry.Set("ulid", (v) => ULID_REGEX.test(v));
  FormatRegistry.Set("nanoid", (v) => NANOID_REGEX.test(v));
  FormatRegistry.Set("objectid", (v) => OBJECTID_REGEX.test(v));
  FormatRegistry.Set("slug", (v) => SLUG_REGEX.test(v));

  // === 网络相关 ===
  FormatRegistry.Set("url", (v) => URL_REGEX.test(v));
  FormatRegistry.Set("uri", (v) => URL_REGEX.test(v)); // 别名
  FormatRegistry.Set("ipv4", (v) => IPV4_REGEX.test(v));
  FormatRegistry.Set("ipv6", (v) => IPV6_REGEX.test(v));
  FormatRegistry.Set("ip", (v) => IPV4_REGEX.test(v) || IPV6_REGEX.test(v));
  FormatRegistry.Set("cidr", (v) => CIDR_REGEX.test(v));
  FormatRegistry.Set("hostname", (v) => HOSTNAME_REGEX.test(v));

  // === 日期时间 ===
  FormatRegistry.Set("date", (v) => DATE_REGEX.test(v));
  FormatRegistry.Set("time", (v) => TIME_REGEX.test(v));
  FormatRegistry.Set("date-time", (v) => DATE_TIME_REGEX.test(v));
  FormatRegistry.Set("datetime", (v) => DATE_TIME_REGEX.test(v)); // 别名
  FormatRegistry.Set("duration", (v) => DURATION_REGEX.test(v));

  // === 手机号 ===
  FormatRegistry.Set("phone", (v) => PHONE_CN_REGEX.test(v)); // 中国大陆
  FormatRegistry.Set("phone-cn", (v) => PHONE_CN_REGEX.test(v));
  FormatRegistry.Set("phone-e164", (v) => PHONE_E164_REGEX.test(v)); // 国际

  // === 编码格式 ===
  FormatRegistry.Set("base64", (v) => BASE64_REGEX.test(v));
  FormatRegistry.Set("base64url", (v) => BASE64URL_REGEX.test(v));
  FormatRegistry.Set("jwt", (v) => JWT_REGEX.test(v));

  // === 颜色 ===
  FormatRegistry.Set("hex-color", (v) => HEX_COLOR_REGEX.test(v));
  FormatRegistry.Set("rgb-color", (v) => RGB_COLOR_REGEX.test(v));
  FormatRegistry.Set(
    "color",
    (v) => HEX_COLOR_REGEX.test(v) || RGB_COLOR_REGEX.test(v),
  );

  // === 其他 ===
  FormatRegistry.Set("emoji", (v) => EMOJI_REGEX.test(v));
  FormatRegistry.Set("semver", (v) => SEMVER_REGEX.test(v));
  FormatRegistry.Set("credit-card", isValidCreditCard);
}

/**
 * 自定义注册 format
 */
export function registerFormat(
  name: string,
  validator: (value: string) => boolean,
): void {
  FormatRegistry.Set(name, validator);
}

/**
 * 检查 format 是否已注册
 */
export function hasFormat(name: string): boolean {
  return FormatRegistry.Has(name);
}

// 导出正则（供外部使用）
export const Patterns = {
  EMAIL: EMAIL_REGEX,
  UUID: UUID_REGEX,
  URL: URL_REGEX,
  IPV4: IPV4_REGEX,
  IPV6: IPV6_REGEX,
  DATE: DATE_REGEX,
  TIME: TIME_REGEX,
  DATE_TIME: DATE_TIME_REGEX,
  PHONE_CN: PHONE_CN_REGEX,
  PHONE_E164: PHONE_E164_REGEX,
  OBJECTID: OBJECTID_REGEX,
  HEX_COLOR: HEX_COLOR_REGEX,
  SLUG: SLUG_REGEX,
  SEMVER: SEMVER_REGEX,
  JWT: JWT_REGEX,
} as const;

