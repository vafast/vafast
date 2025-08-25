import { Server } from "../../src";
import type { Route, Middleware } from "../../src/types";

// CORS 中间件 - 符合 Vafast 文档风格
export function createCORS(
  options: {
    origin?: string[] | "*";
    methods?: string[];
    headers?: string[];
    credentials?: boolean;
    maxAge?: number;
  } = {}
): Middleware {
  const {
    origin = "*",
    methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    headers = ["Content-Type", "Authorization"],
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
        resHeaders.set(
          "Access-Control-Allow-Origin",
          origin === "*" ? "*" : reqOrigin
        );
        resHeaders.set("Access-Control-Allow-Methods", methods.join(","));
        resHeaders.set("Access-Control-Allow-Headers", headers.join(","));
        if (credentials)
          resHeaders.set("Access-Control-Allow-Credentials", "true");
        if (maxAge) resHeaders.set("Access-Control-Max-Age", maxAge.toString());
      }

      return new Response(null, { status: 204, headers: resHeaders });
    }

    // 正常请求：在 next 后添加头部
    const res = await next();

    if (isAllowedOrigin) {
      res.headers.set(
        "Access-Control-Allow-Origin",
        origin === "*" ? "*" : reqOrigin
      );
      if (credentials)
        res.headers.set("Access-Control-Allow-Credentials", "true");
    }

    return res;
  };
}

// 创建 CORS 中间件
const cors = createCORS({
  origin: ["https://example.com", "https://admin.example.com"],
  credentials: true,
  headers: ["Content-Type", "Authorization"],
  methods: ["GET", "POST"],
  maxAge: 86400, // 缓存预检请求1天
});

const routes: Route[] = [
  {
    method: "GET",
    path: "/data",
    handler: () =>
      new Response(
        JSON.stringify({
          message: "Hello with CORS",
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      ),
  },
  {
    method: "POST",
    path: "/data",
    handler: async (req) => {
      const body = await req.json();
      return new Response(
        JSON.stringify({
          message: "Data received with CORS",
          data: body,
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    },
  },
];

const server = new Server(routes);

// 全局中间件
server.use(cors);

export default {
  fetch: (req: Request) => server.fetch(req),
};
