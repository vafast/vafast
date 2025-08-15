/**
 * 请求解析器
 *
 * 基于 Tirne 官方实用函数，提供简单的请求数据解析
 *
 * @author Framework Team
 * @version 1.0.0
 * @license MIT
 */

// 导入 Tirne 官方的实用函数

import { json, parseBody, parseQuery, redirect } from "../util";

// 导出 Tirne 官方函数
export { json, redirect, parseQuery, parseBody };

// 简化的请求数据解析结果
export interface ParsedRequestData {
  body: any;
  query: Record<string, string | string[] | number | boolean>;
  params: Record<string, string | number>;
  headers: Record<string, string>;
  cookies: Record<string, string>;
}

/**
 * 解析查询参数
 * 将 URLSearchParams 转换为对象
 */
export function parseQueryToObject(
  query: URLSearchParams
): Record<string, string | string[] | number | boolean> {
  const queryObj: Record<string, string | string[] | number | boolean> = {};

  for (const [key, value] of query.entries()) {
    queryObj[key] = value;
  }

  return queryObj;
}

/**
 * 解析请求头
 * 从Request对象中提取所有请求头
 */
export function parseHeaders(req: Request): Record<string, string> {
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headers[key] = value;
  });
  return headers;
}

/**
 * 解析Cookie
 * 从Cookie请求头中提取Cookie数据
 */
export function parseCookies(req: Request): Record<string, string> {
  const cookies: Record<string, string> = {};
  const cookieHeader = req.headers.get("cookie");
  if (cookieHeader) {
    cookieHeader.split(";").forEach((cookie) => {
      const [name, value] = cookie.trim().split("=");
      if (name && value) {
        cookies[name] = value;
      }
    });
  }
  return cookies;
}
