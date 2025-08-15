import type { Handler, Middleware } from "./types";
import { matchPath } from "./router";
import type { Route } from "./types";
import { composeMiddleware } from "./middleware";

export class Server {
  private routes: Route[];
  private globalMiddleware: Middleware[] = [];

  constructor(routes: Route[]) {
    this.routes = routes;
  }

  use(mw: Middleware) {
    this.globalMiddleware.push(mw);
  }

  fetch = async (req: Request): Promise<Response> => {
    const { pathname } = new URL(req.url);
    const method = req.method;

    let matched: Route | undefined;
    let params: Record<string, string> = {};

    for (const route of this.routes) {
      if (route.method !== method) continue;

      const result = matchPath(route.path, pathname);
      if (result.matched) {
        matched = route;
        params = result.params;
        break;
      }
    }

    const handler: Handler = async (req) => {
      if (matched) {
        return await matched.handler(req, params);
      } else {
        return new Response("Not Found", { status: 404 });
      }
    };

    const middlewareChain = matched?.middleware
      ? [...this.globalMiddleware, ...matched.middleware]
      : this.globalMiddleware;

    // 使用 composeMiddleware 来确保错误处理中间件被应用
    const composedHandler = composeMiddleware(middlewareChain, handler);
    return await composedHandler(req);
  };
}
