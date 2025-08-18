<template>
  <div class="about">
    <h1>ℹ️ 关于页面</h1>
    <div class="route-info">
      <h2>路由信息</h2>
      <p><strong>路径:</strong> {{ routeInfo.pathname }}</p>
      <p><strong>参数:</strong> {{ JSON.stringify(routeInfo.params) }}</p>
      <p><strong>查询:</strong> {{ JSON.stringify(routeInfo.query) }}</p>
    </div>
    <div class="content">
      <p>这是一个 Vue 组件的关于页面</p>
      <p>框架版本: v1.0.0</p>
      <p>渲染模式: {{ renderMode }}</p>
    </div>
  </div>
</template>

<script setup>
import { inject } from 'vue'

// 注入路由信息
const routeInfo = inject('routeInfo', {
  params: {},
  query: {},
  pathname: '/about'
})

const renderMode = 'SSR'
</script>

<style scoped>
.about {
  padding: 20px;
  font-family: Arial, sans-serif;
}

.route-info {
  background: #f0f8ff;
  padding: 15px;
  border-radius: 8px;
  margin: 20px 0;
}

.route-info h2 {
  margin-top: 0;
  color: #333;
}

.content {
  background: #f0fff0;
  padding: 15px;
  border-radius: 8px;
  border-left: 4px solid #4caf50;
}
</style>
