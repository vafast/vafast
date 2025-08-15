/**
 * HTTP方法工厂
 *
 * 提供各种HTTP方法的类型安全路由工厂函数
 * 自动处理Schema验证，无需手动注入验证中间件
 *
 * @author Framework Team
 * @version 1.0.0
 * @license MIT
 */

import type { TypedRoute } from "../types/route";
import type { Static } from "@sinclair/typebox";
import { createRouteHandler, type TypedConfig, type TypedHandler } from "./route-handler-factory";

// 通用的HTTP方法工厂函数
function createHttpMethodFactory<TMethod extends "GET" | "POST" | "PUT" | "DELETE" | "PATCH">(
  method: TMethod
) {
  return <TConfig extends TypedConfig>(
    path: string,
    handler: TypedHandler<
      TConfig extends { body: any } ? Static<TConfig["body"]> : any,
      TConfig extends { query: any } ? Static<TConfig["query"]> : any,
      TConfig extends { params: any } ? Static<TConfig["params"]> : any,
      TConfig extends { headers: any } ? Static<TConfig["headers"]> : any,
      TConfig extends { cookies: any } ? Static<TConfig["cookies"]> : any
    >,
    config: TConfig = {} as TConfig
  ): TypedRoute => {
    return {
      method,
      path,
      handler: createRouteHandler(config, handler),
      middleware: config.middleware || [],
      ...config,
    };
  };
}

// 增强的GET路由工厂 - 自动Schema验证
export const GET = createHttpMethodFactory("GET");

// 增强的POST路由工厂 - 自动Schema验证
export const POST = createHttpMethodFactory("POST");

// 增强的PUT路由工厂 - 自动Schema验证
export const PUT = createHttpMethodFactory("PUT");

// 增强的DELETE路由工厂 - 自动Schema验证
export const DELETE = createHttpMethodFactory("DELETE");

// 增强的PATCH路由工厂 - 自动Schema验证
export const PATCH = createHttpMethodFactory("PATCH");
