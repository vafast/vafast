import React from 'react';

const SimpleReact = ({ req, params, query }) => {
  const currentTime = new Date().toLocaleString('zh-CN');
  
  return React.createElement('div', { className: 'simple-react' }, [
    React.createElement('h1', { key: 'title' }, 'Simple React Component'),
    React.createElement('p', { key: 'desc' }, 'This is a simple React component for testing'),
    React.createElement('p', { key: 'time' }, `Current time: ${currentTime}`),
    React.createElement('div', { key: 'route-info', className: 'route-info' }, [
      React.createElement('h3', { key: 'route-title' }, 'Route Information'),
      React.createElement('p', { key: 'path' }, `Path: ${new URL(req.url).pathname}`),
      React.createElement('p', { key: 'params' }, `Params: ${JSON.stringify(params)}`),
      React.createElement('p', { key: 'query' }, `Query: ${JSON.stringify(query)}`)
    ])
  ]);
};

export default SimpleReact;
