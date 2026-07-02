import { Server, defineRoutes, createHandler, serve } from 'vafast'

const routes = defineRoutes([
  {
    method: 'GET',
    path: '/',
    handler: createHandler(() => 'Hello Vafast!')
  },
  {
    method: 'GET',
    path: '/health',
    handler: createHandler(() => ({ status: 'ok', timestamp: Date.now() }))
  }
])

const server = new Server(routes)

serve({ fetch: server.fetch, port: 3000 }, () => {
  console.log('🚀 Server running on http://localhost:3000')
})
