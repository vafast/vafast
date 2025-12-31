/**
 * HTML渲染工具类
 * 提供统一的HTML模板生成功能
 */
export class HtmlRenderer {
  /**
   * 生成基础HTML模板
   */
  static generateBaseHtml(
    content: string,
    context: any,
    clientScriptPath: string = "/client.js",
  ): string {
    return `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Vafast SSR App</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body>
          <div id="app">${content}</div>
          <script>
            window.__ROUTE_INFO__ = {
              params: ${JSON.stringify(context.params || {})},
              query: ${JSON.stringify(context.query || {})},
              pathname: '${context.pathname}'
            };
          </script>
          <script type="module" src="${clientScriptPath}"></script>
        </body>
      </html>
    `;
  }

  /**
   * 生成Vue组件HTML
   */
  static generateVueHtml(
    content: string,
    context: any,
    clientScriptPath: string = "/client.js",
  ): string {
    return this.generateBaseHtml(content, context, clientScriptPath);
  }

  /**
   * 生成React组件HTML
   */
  static generateReactHtml(
    content: string,
    context: any,
    clientScriptPath: string = "/client.js",
  ): string {
    return `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Vafast SSR App</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body>
          <div id="root">${content}</div>
          <script>
            window.__ROUTE_INFO__ = {
              params: ${JSON.stringify(context.params || {})},
              query: ${JSON.stringify(context.query || {})},
              pathname: '${context.pathname}'
            };
          </script>
          <script type="module" src="${clientScriptPath}"></script>
        </body>
      </html>
    `;
  }
}
