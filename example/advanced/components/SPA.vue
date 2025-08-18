<template>
  <div class="spa">
    <h1>🚀 SPA 页面</h1>
    <div class="route-info">
      <h2>路由信息</h2>
      <p><strong>路径:</strong> {{ routeInfo.pathname }}</p>
      <p><strong>参数:</strong> {{ JSON.stringify(routeInfo.params) }}</p>
      <p><strong>查询:</strong> {{ JSON.stringify(routeInfo.query) }}</p>
    </div>
    <div class="content">
      <p>这是一个 Vue 组件的 SPA 页面</p>
      <p>渲染模式: 客户端渲染 (SPA)</p>
      <p>当前时间: {{ currentTime }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, inject, onMounted } from 'vue'

// 注入路由信息
const routeInfo = inject('routeInfo', {
  params: {},
  query: {},
  pathname: '/spa'
})

const currentTime = ref('')

onMounted(() => {
  currentTime.value = new Date().toLocaleString('zh-CN')
})
</script>

<style scoped>
.spa {
  padding: 20px;
  font-family: Arial, sans-serif;
}

.route-info {
  background: #fff3e0;
  padding: 15px;
  border-radius: 8px;
  margin: 20px 0;
}

.route-info h2 {
  margin-top: 0;
  color: #333;
}

.content {
  background: #e3f2fd;
  padding: 15px;
  border-radius: 8px;
  border-left: 4px solid #ff9800;
}
</style>
