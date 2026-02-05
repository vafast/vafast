// src/parsers.ts
import qs from "qs";
import cookie from "cookie";

// 文件信息接口
export interface FileInfo {
  name: string;
  type: string;
  size: number;
  data: ArrayBuffer;
}

// 表单数据接口
export interface FormData {
  fields: Record<string, string>;
  files: Record<string, FileInfo>;
}

/**
 * 简化的请求体解析函数
 * 优先简洁性，处理最常见的场景
 * 
 * 注意：此函数假设只用于有 body 的请求（POST/PUT/PATCH 等）
 * 对于 GET/HEAD 请求，调用方应在调用前检查请求方法
 * 参考：defineRoute.ts 中已有正确的检查逻辑
 * 
 * 如果传入 GET/HEAD 请求，会返回 null（防御性编程）
 * 这样即使调用方忘记检查，也不会导致运行时错误
 */
export async function parseBody(req: Request): Promise<unknown> {
  // 防御性检查：GET/HEAD 请求没有 body
  // HTTP 规范：GET/HEAD 请求通常不带 body，即使带了 Content-Type 也不应解析
  // 参考 Fastify: "for GET and HEAD requests, the payload is never parsed"
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD") {
    return null;
  }

  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return await req.json();
  }
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await req.text();
    return Object.fromEntries(new URLSearchParams(text));
  }
  return await req.text(); // fallback
}

/**
 * 解析 multipart/form-data 格式
 * 支持文件上传和普通表单字段
 */
async function parseMultipartFormData(req: Request): Promise<FormData> {
  const formData = await req.formData();
  const result: FormData = {
    fields: {},
    files: {},
  };

  for (const [key, value] of formData.entries()) {
    if (
      typeof value === "object" &&
      value !== null &&
      "name" in value &&
      "type" in value &&
      "size" in value
    ) {
      // 处理文件
      const file = value as any;
      const arrayBuffer = await file.arrayBuffer();
      result.files[key] = {
        name: file.name,
        type: file.type,
        size: file.size,
        data: arrayBuffer,
      };
    } else {
      // 处理普通字段
      result.fields[key] = value as string;
    }
  }

  return result;
}

/**
 * 解析请求体为特定类型
 * 提供类型安全的解析方法
 */
export async function parseBodyAs<T>(req: Request): Promise<T> {
  const body = await parseBody(req);
  return body as T;
}

/**
 * 解析请求体为表单数据
 * 专门用于处理 multipart/form-data
 */
export async function parseFormData(req: Request): Promise<FormData> {
  const contentType = req.headers.get("content-type") || "";

  if (!contentType.includes("multipart/form-data")) {
    throw new Error("请求不是 multipart/form-data 格式");
  }

  return await parseMultipartFormData(req);
}

/**
 * 解析请求体为文件
 * 专门用于处理文件上传
 */
export async function parseFile(req: Request): Promise<FileInfo> {
  const contentType = req.headers.get("content-type") || "";

  if (!contentType.includes("multipart/form-data")) {
    throw new Error("请求不是 multipart/form-data 格式");
  }

  const formData = await parseMultipartFormData(req);
  const fileKeys = Object.keys(formData.files);

  if (fileKeys.length === 0) {
    throw new Error("请求中没有文件");
  }

  if (fileKeys.length > 1) {
    throw new Error("请求中包含多个文件，请使用 parseFormData");
  }

  return formData.files[fileKeys[0]];
}

/**
 * 快速提取 query string（避免创建 URL 对象）
 */
function extractQueryString(url: string): string {
  const qIndex = url.indexOf("?");
  if (qIndex === -1) return "";

  const hashIndex = url.indexOf("#", qIndex);
  return hashIndex === -1
    ? url.substring(qIndex + 1)
    : url.substring(qIndex + 1, hashIndex);
}

/** 获取查询字符串，直接返回对象 */
export function parseQuery(req: Request): Record<string, unknown> {
  const queryString = extractQueryString(req.url);
  if (!queryString) return {};
  return qs.parse(queryString);
}

/**
 * 快速解析简单查询字符串（不支持嵌套，但更快）
 * 适用于简单的 key=value&key2=value2 场景
 */
export function parseQueryFast(req: Request): Record<string, string> {
  const queryString = extractQueryString(req.url);
  if (!queryString) return {};

  const result: Record<string, string> = Object.create(null);
  const pairs = queryString.split("&");

  for (const pair of pairs) {
    const eqIndex = pair.indexOf("=");
    if (eqIndex === -1) {
      result[decodeURIComponent(pair)] = "";
    } else {
      const key = decodeURIComponent(pair.substring(0, eqIndex));
      const value = decodeURIComponent(pair.substring(eqIndex + 1));
      result[key] = value;
    }
  }

  return result;
}

/** 解析请求头，返回对象 */
export function parseHeaders(req: Request): Record<string, string> {
  const headers: Record<string, string> = Object.create(null);
  req.headers.forEach((value, key) => {
    headers[key] = value;
  });
  return headers;
}

/**
 * 获取单个请求头（避免解析全部）
 */
export function getHeader(req: Request, name: string): string | null {
  return req.headers.get(name);
}

/** 使用cookie库解析Cookie，保证可靠性 */
export function parseCookies(req: Request): Record<string, string> {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return {};

  try {
    const parsed = cookie.parse(cookieHeader);
    // 过滤掉undefined和null值
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (value !== undefined && value !== null) {
        result[key] = value;
      }
    }
    return result;
  } catch {
    return {};
  }
}

/**
 * 快速解析 Cookie（简化版，不使用外部库）
 * 适用于简单的 cookie 场景
 */
export function parseCookiesFast(req: Request): Record<string, string> {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return {};

  const result: Record<string, string> = Object.create(null);
  const pairs = cookieHeader.split(";");

  for (const pair of pairs) {
    const trimmed = pair.trim();
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex > 0) {
      const key = trimmed.substring(0, eqIndex).trim();
      const value = trimmed.substring(eqIndex + 1).trim();
      // 移除引号
      result[key] =
        value.startsWith('"') && value.endsWith('"')
          ? value.slice(1, -1)
          : value;
    }
  }

  return result;
}

/**
 * 获取单个 Cookie 值（避免解析全部）
 */
export function getCookie(req: Request, name: string): string | null {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return null;

  const prefix = `${name}=`;
  const pairs = cookieHeader.split(";");

  for (const pair of pairs) {
    const trimmed = pair.trim();
    if (trimmed.startsWith(prefix)) {
      const value = trimmed.substring(prefix.length).trim();
      return value.startsWith('"') && value.endsWith('"')
        ? value.slice(1, -1)
        : value;
    }
  }

  return null;
}
