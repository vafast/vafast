// src/middleware/authMiddleware.ts
import type { Middleware } from "../types";
import { VafastError } from "../middleware";
import { getCookie } from "../cookie";

export const requireAuth: Middleware = async (req, next) => {
  const token = getCookie(req, "auth");

  if (!token || token !== "valid-token") {
    throw new VafastError("Unauthorized", {
      status: 401,
      type: "unauthorized",
      expose: true,
    });
  }

  return next();
};
