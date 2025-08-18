// SPA 客户端脚本
console.log('🚀 SPA 客户端脚本加载成功');

// 获取路由信息
const routeInfo = window.__ROUTE_INFO__ || {};
console.log('📍 当前路由信息:', routeInfo);

// 模拟客户端渲染
document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `
      <div class="spa-content">
        <h1>🚀 SPA 客户端渲染</h1>
        <p>这是一个 Vue 组件的 SPA 页面</p>
        <p>渲染模式: 客户端渲染 (SPA)</p>
        <p>当前时间: ${new Date().toLocaleString('zh-CN')}</p>
        <div class="route-info">
          <h3>路由信息</h3>
          <p>路径: ${routeInfo.pathname}</p>
          <p>参数: ${JSON.stringify(routeInfo.params)}</p>
          <p>查询: ${JSON.stringify(routeInfo.query)}</p>
        </div>
      </div>
    `;
  }
});
