// 客户端脚本 (用于 SSR 页面)
console.log('🚀 客户端脚本加载成功');

// 获取路由信息
const routeInfo = window.__ROUTE_INFO__ || {};
console.log('📍 当前路由信息:', routeInfo);

// 客户端激活 (hydration)
document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ 页面加载完成，客户端激活中...');
  
  // 这里可以添加客户端交互逻辑
  // 比如事件监听器、状态管理等
  
  console.log('🎯 客户端激活完成');
});
