import type { Middleware } from "../types";

export interface CORSOptions {
  origin?: string[] | "*";
  methods?: string[];
  headers?: string[];
  credentials?: boolean;
  maxAge?: number;
}

export function createCORS(options: CORSOptions = {}): Middleware {
  const {
    origin = [],
    methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    headers = [],
    credentials = false,
    maxAge,
  } = options;

  return async (req, next) => {
    const reqOrigin = req.headers.get("Origin") || "";

    // 判断：是否为允许的 Origin？
    const isAllowedOrigin = origin === "*" || origin.includes(reqOrigin);

    // 预检 (OPTIONS) 请求处理
    if (req.method === "OPTIONS") {
      const resHeaders = new Headers();

      if (isAllowedOrigin) {
        resHeaders.set("Access-Control-Allow-Origin", origin === "*" ? "*" : reqOrigin);
        resHeaders.set("Access-Control-Allow-Methods", methods.join(","));
        resHeaders.set("Access-Control-Allow-Headers", headers.join(","));
        if (credentials) resHeaders.set("Access-Control-Allow-Credentials", "true");
        if (maxAge) resHeaders.set("Access-Control-Max-Age", maxAge.toString());
      }

      return new Response(null, { status: 204, headers: resHeaders });
    }

    // 正常请求：在 next 后添加头部
    const res = await next();

    if (isAllowedOrigin) {
      res.headers.set("Access-Control-Allow-Origin", origin === "*" ? "*" : reqOrigin);
      if (credentials) res.headers.set("Access-Control-Allow-Credentials", "true");
    }

    return res;
  };
}
