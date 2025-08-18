import React from 'react';

interface AdminDashboardProps {
  req: Request;
  params: Record<string, string>;
  query: Record<string, string>;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ req, params, query }) => {
  const currentTime = new Date().toLocaleString('zh-CN');
  
  return (
    <div className="admin-dashboard">
      <h1>👑 管理员仪表板</h1>
      
      <div className="route-info">
        <h2>路由信息</h2>
        <p><strong>路径:</strong> {new URL(req.url).pathname}</p>
        <p><strong>参数:</strong> {JSON.stringify(params)}</p>
        <p><strong>查询:</strong> {JSON.stringify(query)}</p>
      </div>
      
      <div className="content">
        <p>这是一个 React 组件的管理员仪表板</p>
        <p>当前时间: {currentTime}</p>
        <p>用户权限: 管理员</p>
      </div>
      
      <div className="stats">
        <h3>系统统计</h3>
        <div className="stat-grid">
          <div className="stat-item">
            <span className="stat-number">1,234</span>
            <span className="stat-label">总用户</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">567</span>
            <span className="stat-label">活跃用户</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">89</span>
            <span className="stat-label">今日新增</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
