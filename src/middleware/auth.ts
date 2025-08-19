// src/middleware/auth.ts

import type { Middleware } from "../types";
import { VafastError } from "../middleware";
import { getCookie } from "../utils/handle";
import { verifyToken, TokenError, type TokenPayload } from "../auth/token";

interface AuthOptions {
  secret: string;
  cookieName?: string;
  headerName?: string;
  required?: boolean; // 是否必需认证
  roles?: string[]; // 允许的角色
  permissions?: string[]; // 允许的权限
}

export function createAuth(options: AuthOptions): Middleware {
  const {
    secret,
    cookieName = "auth",
    headerName = "authorization",
    required = true,
    roles = [],
    permissions = [],
  } = options;

  return async (req, next) => {
    const token =
      getCookie(req, cookieName) ||
      req.headers.get(headerName)?.replace("Bearer ", "") ||
      "";

    if (!token && required) {
      throw new VafastError("缺少认证令牌", {
        status: 401,
        type: "unauthorized",
        expose: true,
      });
    }

    if (!token && !required) {
      return next();
    }

    try {
      const user = (await verifyToken(token, secret)) as TokenPayload;

      if (!user) {
        throw new VafastError("令牌验证失败", {
          status: 401,
          type: "unauthorized",
          expose: true,
        });
      }

      // 检查角色权限
      if (roles.length > 0 && user.role && !roles.includes(user.role)) {
        throw new VafastError("权限不足", {
          status: 403,
          type: "forbidden",
          expose: true,
        });
      }

      // 检查具体权限
      if (permissions.length > 0 && user.permissions) {
        const userPermissions = Array.isArray(user.permissions)
          ? user.permissions
          : [user.permissions];

        const hasPermission = permissions.some((permission) =>
          userPermissions.includes(permission)
        );

        if (!hasPermission) {
          throw new VafastError("权限不足", {
            status: 403,
            type: "forbidden",
            expose: true,
          });
        }
      }

      // 🪄 在这里扩展 Request 对象
      (req as any).user = user;
      (req as any).token = token;

      return next();
    } catch (error) {
      if (error instanceof TokenError) {
        let status = 401;
        let message = "认证失败";

        switch (error.code) {
          case "EXPIRED_TOKEN":
            status = 401;
            message = "令牌已过期";
            break;
          case "INVALID_SIGNATURE":
            status = 401;
            message = "令牌签名无效";
            break;
          case "MALFORMED_TOKEN":
            status = 400;
            message = "令牌格式错误";
            break;
          default:
            status = 401;
            message = "令牌验证失败";
        }

        throw new VafastError(message, {
          status,
          type: "unauthorized",
          expose: true,
        });
      }

      if (error instanceof VafastError) {
        throw error;
      }

      throw new VafastError("认证过程中发生错误", {
        status: 500,
        type: "internal_error",
        expose: false,
      });
    }
  };
}

// 可选认证中间件
export function createOptionalAuth(
  options: Omit<AuthOptions, "required">
): Middleware {
  return createAuth({ ...options, required: false });
}

// 角色验证中间件
export function createRoleAuth(
  roles: string[],
  options: Omit<AuthOptions, "roles">
): Middleware {
  return createAuth({ ...options, roles });
}

// 权限验证中间件
export function createPermissionAuth(
  permissions: string[],
  options: Omit<AuthOptions, "permissions">
): Middleware {
  return createAuth({ ...options, permissions });
}
