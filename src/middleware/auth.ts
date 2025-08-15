// src/middleware/auth.ts

import type { Middleware } from "../types";
import { VafastError } from "../middleware";
import { getCookie } from "../cookie";
import { verifyToken } from "../auth/token";

interface AuthOptions {
  secret: string;
  cookieName?: string;
  headerName?: string;
}

export function createAuth(options: AuthOptions): Middleware {
  const { secret, cookieName = "auth", headerName = "authorization" } = options;

  return async (req, next) => {
    const token =
      getCookie(req, cookieName) || req.headers.get(headerName)?.replace("Bearer ", "") || "";

    const user = await verifyToken(token, secret);

    if (!user) {
      throw new VafastError("Unauthorized", {
        status: 401,
        type: "unauthorized",
        expose: true,
      });
    }

    // 🪄 在这里扩展 Request 对象
    (req as any).user = user;

    return next();
  };
}
