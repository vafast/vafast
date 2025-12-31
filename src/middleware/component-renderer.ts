/**
 * 组件渲染中间件 - 专注 SSR
 * 支持 Vue 和 React 的服务端渲染
 */

// Vue SSR 渲染
const renderVueSSR = async (
  componentImport: () => Promise<any>,
  req: Request,
  preloadedDeps?: any,
) => {
  try {
    // 使用预加载的依赖或动态导入
    const { createSSRApp, renderToString } =
      preloadedDeps ||
      (await Promise.all([import("vue"), import("@vue/server-renderer")]).then(
        ([vue, renderer]) => ({
          createSSRApp: vue.createSSRApp,
          renderToString: renderer.renderToString,
        }),
      ));

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
      },
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
      { status: 500 },
    );
  }
};

// React SSR 渲染
const renderReactSSR = async (
  componentImport: () => Promise<any>,
  req: Request,
  preloadedDeps?: any,
) => {
  try {
    // 使用预加载的依赖或动态导入
    const { createElement, renderToString } =
      preloadedDeps ||
      (await Promise.all([import("react"), import("react-dom/server")]).then(
        ([react, renderer]) => ({
          createElement: react.createElement,
          renderToString: renderer.renderToString,
        }),
      ));

    const componentModule = await componentImport();
    const Component = componentModule.default || componentModule;

    const content = createElement(Component, {
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
      },
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
      { status: 500 },
    );
  }
};

// Vue 组件渲染器 - 专注 SSR
export const vueRenderer = (preloadedDeps?: any) => {
  return async (req: Request, next: () => Promise<Response>) => {
    (req as any).renderVue = async (componentImport: () => Promise<any>) => {
      return await renderVueSSR(componentImport, req, preloadedDeps);
    };
    return next();
  };
};

// React 组件渲染器 - 专注 SSR
export const reactRenderer = (preloadedDeps?: any) => {
  return async (req: Request, next: () => Promise<Response>) => {
    (req as any).renderReact = async (componentImport: () => Promise<any>) => {
      return await renderReactSSR(componentImport, req, preloadedDeps);
    };
    return next();
  };
};
