/**
 * 组件渲染中间件 - 专注 SSR
 * 支持 Vue 和 React 的服务端渲染
 */

// Vue SSR 渲染
const renderVueSSR = async (componentImport: () => Promise<any>, req: Request) => {
  try {
    const { createSSRApp } = await import("vue");
    const { renderToString } = await import("@vue/server-renderer");

    const componentModule = await componentImport();
    const component = componentModule.default || componentModule;

    const app = createSSRApp(component);

    // 提供路由信息
    app.provide("routeInfo", {
      params: (req as any).params || {},
      query: Object.fromEntries(new URL(req.url).searchParams),
      pathname: new URL(req.url).pathname,
    });

    const html = await renderToString(app);

    return new Response(
      `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Vue SSR App</title>
        </head>
        <body>
          <div id="app">${html}</div>
          <script>
            window.__ROUTE_INFO__ = {
              params: ${JSON.stringify((req as any).params || {})},
              query: ${JSON.stringify(Object.fromEntries(new URL(req.url).searchParams))},
              pathname: '${new URL(req.url).pathname}'
            };
          </script>
          <script type="module" src="/client.js"></script>
        </body>
      </html>
    `,
      {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  } catch (error) {
    console.error("Vue SSR 渲染失败:", error);
    return new Response(
      `
      <!doctype html>
      <html>
        <head><title>渲染错误</title></head>
        <body>
          <h1>Vue SSR 渲染失败</h1>
          <p>错误信息: ${error instanceof Error ? error.message : "未知错误"}</p>
        </body>
      </html>
    `,
      { status: 500 }
    );
  }
};

// React SSR 渲染
const renderReactSSR = async (componentImport: () => Promise<any>, req: Request) => {
  try {
    const React = await import("react");
    const { renderToString } = await import("react-dom/server");

    const componentModule = await componentImport();
    const Component = componentModule.default || componentModule;

    const content = React.createElement(Component, {
      req,
      params: (req as any).params || {},
      query: Object.fromEntries(new URL(req.url).searchParams),
    });

    const html = renderToString(content);

    return new Response(
      `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>React SSR App</title>
        </head>
        <body>
          <div id="root">${html}</div>
          <script>
            window.__ROUTE_INFO__ = {
              params: ${JSON.stringify((req as any).params || {})},
              query: ${JSON.stringify(Object.fromEntries(new URL(req.url).searchParams))},
              pathname: '${new URL(req.url).pathname}'
            };
          </script>
          <script type="module" src="/client.js"></script>
        </body>
      </html>
    `,
      {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  } catch (error) {
    console.error("React SSR 渲染失败:", error);
    return new Response(
      `
      <!doctype html>
      <html>
        <head><title>渲染错误</title></head>
        <body>
          <h1>React SSR 渲染失败</h1>
          <p>错误信息: ${error instanceof Error ? error.message : "未知错误"}</p>
        </body>
      </html>
    `,
      { status: 500 }
    );
  }
};

// Vue 组件渲染器 - 专注 SSR
export const vueRenderer = () => {
  return async (req: Request, next: () => Promise<Response>) => {
    (req as any).renderVue = async (componentImport: () => Promise<any>) => {
      return await renderVueSSR(componentImport, req);
    };
    return next();
  };
};

// React 组件渲染器 - 专注 SSR
export const reactRenderer = () => {
  return async (req: Request, next: () => Promise<Response>) => {
    (req as any).renderReact = async (componentImport: () => Promise<any>) => {
      return await renderReactSSR(componentImport, req);
    };
    return next();
  };
};
