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
 * 增强的请求体解析函数
 * 支持多种内容类型：JSON、表单、文件上传、纯文本等
 */
export async function parseBody(req: Request): Promise<unknown> {
  const contentType = req.headers.get("content-type") || "";
  const contentLength = req.headers.get("content-length");

  // 检查内容长度限制（默认 10MB）
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (contentLength && parseInt(contentLength) > maxSize) {
    throw new Error(
      `请求体过大: ${contentLength} bytes (最大允许: ${maxSize} bytes)`
    );
  }

  try {
    if (contentType.includes("application/json")) {
      return await req.json();
    }

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const text = await req.text();
      return Object.fromEntries(new URLSearchParams(text));
    }

    if (contentType.includes("multipart/form-data")) {
      return await parseMultipartFormData(req);
    }

    if (contentType.includes("text/plain")) {
      return await req.text();
    }

    if (contentType.includes("application/octet-stream")) {
      return await req.arrayBuffer();
    }

    // 默认返回文本
    return await req.text();
  } catch (error) {
    throw new Error(
      `解析请求体失败: ${error instanceof Error ? error.message : "未知错误"}`
    );
  }
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

/** 获取查询字符串，直接返回对象 */
export function parseQuery(req: Request): Record<string, any> {
  const url = new URL(req.url);
  return qs.parse(url.search.slice(1)); // 去掉开头的 ?
}

/** 解析请求头，返回对象 */
export function parseHeaders(req: Request): Record<string, string> {
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    if (value !== undefined && value !== null) {
      headers[key] = value;
    }
  });
  return headers;
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
  } catch (error) {
    console.error("Cookie解析失败:", error);
    console.error("原始Cookie字符串:", cookieHeader);
    return {};
  }
}
