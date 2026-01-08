import { defineRoutes, createHandler, Type } from './src'

// 对象字面量方式
const routes = defineRoutes([
  {
    method: 'GET',
    path: '/users',
    handler: createHandler(
      { query: Type.Object({ page: Type.Number() }) },
      ({ query }) => ({ users: [], page: query.page })
    )
  },
  {
    method: 'POST',
    path: '/users',
    handler: createHandler(
      { body: Type.Object({ name: Type.String() }) },
      ({ body }) => ({ id: '1', name: body.name })
    )
  }
])

// 检查类型 - 如果这行不报错，说明 method 是 'GET' 字面量类型
const _check: 'GET' = routes[0].method
console.log('method:', routes[0].method)
