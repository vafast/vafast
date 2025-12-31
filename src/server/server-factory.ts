import type { Route, NestedRoute } from "../types";
import type {
  ComponentRoute,
  NestedComponentRoute,
} from "../types/component-route";
import { Server } from "../server";
import { ComponentServer } from "./component-server";

/**
 * 服务器工厂类
 * 用于创建和管理不同类型的服务器
 */
export class ServerFactory {
  private servers: Map<string, Server | ComponentServer> = new Map();

  /**
   * 创建标准REST API服务器
   */
  createRestServer(routes: (Route | NestedRoute)[]): Server {
    const server = new Server(routes);
    this.servers.set("rest", server);
    return server;
  }

  /**
   * 创建组件服务器
   */
  createComponentServer(
    routes: (ComponentRoute | NestedComponentRoute)[],
  ): ComponentServer {
    const server = new ComponentServer(routes);
    this.servers.set("component", server);
    return server;
  }

  /**
   * 获取指定类型的服务器
   */
  getServer(type: "rest" | "component"): Server | ComponentServer | undefined {
    return this.servers.get(type);
  }

  /**
   * 获取所有服务器
   */
  getAllServers(): Map<string, Server | ComponentServer> {
    return this.servers;
  }

  /**
   * 移除指定类型的服务器
   */
  removeServer(type: string): boolean {
    return this.servers.delete(type);
  }

  /**
   * 清除所有服务器
   */
  clearServers(): void {
    this.servers.clear();
  }

  /**
   * 获取服务器状态信息
   */
  getServerStatus(): Record<string, { type: string; routes: number }> {
    const status: Record<string, { type: string; routes: number }> = {};

    for (const [name, server] of this.servers) {
      if (server instanceof Server) {
        status[name] = {
          type: "REST API",
          routes: (server as any).routes?.length || 0,
        };
      } else if (server instanceof ComponentServer) {
        status[name] = {
          type: "Component",
          routes: (server as any).routes?.length || 0,
        };
      }
    }

    return status;
  }
}
