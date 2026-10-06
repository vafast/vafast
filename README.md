# Vafast 🚀

[English](README.md) | [中文](README.zh-CN.md)

[![npm version](https://img.shields.io/npm/v/vafast.svg)](https://www.npmjs.com/package/vafast)
[![npm downloads](https://img.shields.io/npm/dm/vafast.svg)](https://www.npmjs.com/package/vafast)
[![CI](https://github.com/vafast/vafast/actions/workflows/ci.yml/badge.svg)](https://github.com/vafast/vafast/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript)](https://www.typescriptlang.org/)

**High-performance TypeScript web framework - type-safe, lightweight, and blazing fast.**

Vafast is more than a framework—it's a development philosophy emphasizing **structure, clarity, and control**. Built for the edge with first-class support for Bun, Node.js, and Cloudflare Workers.

📖 **Documentation:** [English](https://vafast.okayok.ai/en/) | [中文](https://vafast.okayok.ai) | [Docs Repo](https://github.com/vafast/vafast-docs)

---

## ⚡ Quick Start

```bash
npx create-vafast-app
```

Follow the prompts, then:

```bash
cd my-vafast-app
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your app running.

---

## 📦 Installation

### Option 1: Scaffolding (Recommended)

```bash
npx create-vafast-app
```

### Option 2: Manual Installation

```bash
npm install vafast
```

Create `index.ts`:

```typescript
import { Server, defineRoute, defineRoutes, serve } from 'vafast';

const routes = defineRoutes([
  defineRoute({
    method: 'GET',
    path: '/',
    handler: () => 'Hello Vafast!'
  })
]);

const server = new Server(routes);
serve({ fetch: server.fetch, port: 3000 }, (info) => {
  console.log(`🚀 Server running at http://localhost:${info.port}`);
});
```

Run it:

```bash
npx tsx index.ts
```

---

## ⚡ Performance

| Framework | RPS | Relative |
|-----------|-----|----------|
| Elysia | ~118K | 100% |
| **Vafast** | **~101K** | **86%** |
| Express | ~56K | 48% |
| Hono | ~56K | 47% |

> **Vafast is ~1.8x faster than Express/Hono!**  
> Tested with Bun 1.2.20, macOS, wrk (4 threads, 100 connections, 30s)

---

## 🎯 Core Features

- ⚡ **JIT Compiled Validators** - Schema validation with compilation caching
- 🌲 **Radix Tree Router** - O(k) time complexity routing
- 🎯 **Fast Request Parsing** - 2x faster Query/Cookie parsing
- 🔒 **End-to-End Type Safety** - Full TypeScript type inference
- 🧩 **Flexible Middleware** - Composable middleware architecture
- 📡 **SSE Streaming** - Built-in Server-Sent Events support for AI chat, progress updates, etc.
- 🌍 **Edge Native** - Same code runs on Bun, Node.js, and Cloudflare Workers
- 📦 **Zero Config** - Works out of the box

---

## 💡 Design Philosophy

### 1. Structure as Truth — No Decorators, No Magic

**Other frameworks** use chaining (method chaining pattern), making routes hard to overview:

```typescript
// Elysia / Hono
const app = new Hono()
  .get('/users', handler1)
  .post('/users', handler2)
  .get('/users/:id', handler3)
  .use(somePlugin);  // Where does this apply?
```

**Vafast** uses declarative routes—see all endpoints at a glance:

```typescript
import { Server, defineRoute, defineRoutes } from 'vafast';

const routes = defineRoutes([
  defineRoute({ method: 'GET', path: '/users', handler: () => 'list' }),
  defineRoute({ method: 'POST', path: '/users', handler: ({ body }) => body }),
  defineRoute({ method: 'GET', path: '/users/:id', handler: ({ params }) => params.id }),
]);

const server = new Server(routes);
```

Routes are data. Visibility at a glance.

### 2. Errors as Data — Not Chaos, but Contracts

**Other frameworks** throw unstructured errors:

```typescript
// Hono
throw new HTTPException(400, { message: 'Missing name' });
// Response format is inconsistent
```

**Vafast** provides semantic error APIs with unified response format:

```typescript
import { err } from 'vafast';

throw err.badRequest('Missing name');
throw err.unauthorized('Login required');
throw err.notFound('User not found');

// All errors: { code: number, message: string }
// Schema validation errors: { code: 422, message: string, details: [...] }
```

### 3. Composition over Convention — Explicit over Implicit

**Other frameworks** use global middleware with path matching:

```typescript
// Hono
app.use('/*', cors());           // Global
app.use('/api/*', auth);         // /api/* but what about /api itself?
```

**Vafast** declares middleware explicitly on routes:

```typescript
const routes = defineRoutes([
  defineRoute({
    method: 'GET',
    path: '/public',
    handler: () => 'public'
  }),
  defineRoute({
    method: 'GET',
    path: '/api/users',
    middleware: [authMiddleware],  // Declared here, clear scope
    handler: () => 'users'
  }),
]);
```

### 4. Extensible Fields — Declarative Metadata for Business Logic

**Vafast** supports arbitrary fields in route definitions for webhooks, permissions, billing, etc.:

```typescript
import { defineRoute, defineRoutes, getRouteRegistry } from 'vafast';

const routes = defineRoutes([
  defineRoute({
    method: 'POST',
    path: '/ai/generate',
    name: 'AI Generation',
    billing: { price: 0.01, currency: 'USD' },  // ✨ Custom field
    webhook: { eventKey: 'ai.generate' },       // ✨ Custom field
    permission: 'ai.generate',                  // ✨ Custom field
    handler: async ({ body }) => generateAI(body.prompt)
  }),
]);

// Query routes by metadata
const paidRoutes = getRouteRegistry().filter('billing');
const webhookRoutes = getRouteRegistry().filter('webhook');
```

Routes become the single source of truth for your API.

### 5. Type Injection — Types Across Files

**Other frameworks** lose types when splitting into multiple files:

```typescript
// Hono
export function setupRoutes(app: Hono) {
  app.get('/profile', (c) => {
    const user = c.get('user');  // ❌ Type is unknown
  });
}
```

**Vafast** preserves types through `withContext`:

```typescript
import { defineMiddleware, withContext } from 'vafast';

const authMiddleware = defineMiddleware<{ user: User }>(async (req, next) => {
  const user = await verifyToken(req.headers.get('Authorization'));
  return next({ user });
});

const defineAuthRoute = withContext<{ user: User }>();

export const profileRoute = defineAuthRoute({
  method: 'GET',
  path: '/profile',
  middleware: [authMiddleware],
  handler: ({ user }) => {
    // ✅ user is fully typed: User
    return { profile: user };
  }
});
```

Types follow the handler, not the app instance.

### 6. Edge Native — One Line, Any Runtime

Same code, different exports:

```typescript
import { Server, defineRoute, defineRoutes } from 'vafast';

const routes = defineRoutes([
  defineRoute({ method: 'GET', path: '/', handler: () => 'Hello!' })
]);

const server = new Server(routes);

// Bun
export default { port: 3000, fetch: server.fetch };

// Cloudflare Workers
export default { fetch: server.fetch };

// Node.js
import { serve } from 'vafast';
serve({ fetch: server.fetch, port: 3000 });
```

---

## 📘 Usage Examples

### Type-Safe Routes with Schema Validation

```typescript
import { Server, defineRoute, defineRoutes, Type } from 'vafast';

const routes = defineRoutes([
  defineRoute({
    method: 'POST',
    path: '/users',
    schema: {
      body: Type.Object({
        name: Type.String({ minLength: 1 }),
        email: Type.String({ format: 'email' })
      })
    },
    handler: ({ body }) => {
      // body.name and body.email are fully typed
      return { success: true, user: body };
    }
  })
]);

const server = new Server(routes);
```

### Path Parameters

```typescript
defineRoute({
  method: 'GET',
  path: '/users/:id',
  schema: {
    params: Type.Object({ id: Type.String() })
  },
  handler: ({ params }) => ({ userId: params.id })
})
```

### Middleware

```typescript
import { defineMiddleware } from 'vafast';

const authMiddleware = defineMiddleware(async (req, next) => {
  const token = req.headers.get('Authorization');
  if (!token) return new Response('Unauthorized', { status: 401 });
  return next();
});

const routes = defineRoutes([
  defineRoute({
    method: 'GET',
    path: '/protected',
    middleware: [authMiddleware],
    handler: () => ({ secret: 'data' })
  })
]);
```

### Nested Routes

```typescript
const routes = defineRoutes([
  defineRoute({
    path: '/api',
    middleware: [apiMiddleware],
    children: [
      defineRoute({ method: 'GET', path: '/users', handler: getUsers }),
      defineRoute({ method: 'POST', path: '/users', handler: createUser }),
      defineRoute({
        path: '/users/:id',
        children: [
          defineRoute({ method: 'GET', path: '/', handler: getUser }),
          defineRoute({ method: 'PUT', path: '/', handler: updateUser }),
          defineRoute({ method: 'DELETE', path: '/', handler: deleteUser }),
        ]
      })
    ]
  })
]);
```

### SSE Streaming (AI Chat, Progress Updates)

```typescript
import { defineRoute, defineRoutes } from 'vafast';

const routes = defineRoutes([
  defineRoute({
    method: 'POST',
    path: '/chat/stream',
    sse: true,  // Enable SSE
    handler: async function* ({ body }) {
      yield { type: 'start', input: body.message };
      
      for await (const chunk of aiStream(body.message)) {
        yield { type: 'text_delta', content: chunk };
      }
      
      yield { type: 'done' };
    },
  }),
]);
```

### Response Helpers and Error Handling

```typescript
import { defineRoute, json, err } from 'vafast';

defineRoute({
  method: 'POST',
  path: '/users',
  handler: ({ body }) => {
    // Success responses
    return body;                      // 200 + JSON (auto-converted)
    return json(body, 201);           // 201 Created
    return json(body, 200, {          // Custom headers
      'X-Request-Id': 'abc123'
    });
    return 'Hello';                   // 200 + text/plain
    return new Response(...);         // Full control

    // Error responses (unified format)
    throw err.badRequest('Invalid params');      // 400
    throw err.unauthorized('Login required');    // 401
    throw err.forbidden('No permission');        // 403
    throw err.notFound('User not found');        // 404
    throw err.conflict('Username exists');       // 409
    throw err.unprocessable('Cannot process');   // 422
    throw err.internal('Server error');          // 500
    throw err('Business error', 404, 40401);     // HTTP 404, code 40401
  }
});
```

**Error Response Contract:**

| Scenario | HTTP | Response Body |
|----------|------|---------------|
| Success | 2xx | Raw JSON business data |
| Schema validation failed | **422** | `{ code: 422, message, details[] }` |
| Business/auth error | 4xx/5xx | `{ code: number, message: string }` |

---

## 🔧 Runtime Support

```typescript
import { serve } from 'vafast';
serve({ fetch: server.fetch, port: 3000 }, (info) => {
  console.log(`🚀 Server running at http://localhost:${info.port}`);
});
```

> 💡 `serve` is compatible with both Bun and Node.js—no code changes needed

**Bun native syntax (Bun only):**

```typescript
export default { port: 3000, fetch: server.fetch };
```

---

## 📚 Documentation

### Getting Started
- [Quick Start](./docs/getting-started/quickstart.md)
- [Examples](./examples/)

### Core Concepts
- [withContext Guide](./docs/with-context.md) - Parent middleware type injection
- [Router Design & Gateway Architecture](./docs/router-design.md) - Design philosophy and AI-era capabilities
- [Local Tools Mode](./docs/local-tools-mode.md) - Use routes as AI tools without HTTP

### Advanced
- [SSE (Server-Sent Events)](./docs/sse.md)
- [Server Optimization](./docs/server-optimization.md)
- [Authentication](./docs/auth.md)

### Reference
- [API Spec Generation](./docs/getting-started/quickstart.md#api-spec-generation)
- [RouteRegistry API](./docs/router-design.md)

**Full Documentation:** [https://vafast.okayok.ai/en/](https://vafast.okayok.ai/en/) (English) | [https://vafast.okayok.ai](https://vafast.okayok.ai) (中文)

---

## 🤝 Contributing

Contributions are welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md).

```bash
git clone https://github.com/vafast/vafast.git
cd vafast
npm install
npm test
```

---

## 🚀 Release Workflow

**One command to release:**

```bash
npm run release
```

**Automatically:**
1. ✅ `bumpp` interactive version selection (patch/minor/major)
2. ✅ Update `package.json` version
3. ✅ Create git commit + tag
4. ✅ Push to GitHub
5. ✅ GitHub Actions auto-trigger:
   - Build + test
   - Generate release notes with `changelogithub`
   - Create GitHub release
   - Publish to npm (Trusted Publishing)

**Commit conventions (for changelog generation):**

```bash
feat: new feature      # → 🚀 Features
fix: bug fix           # → 🐛 Bug Fixes
docs: documentation    # → 📝 Documentation
perf: performance      # → ⚡ Performance
refactor: refactoring  # → ♻️ Refactors
chore: misc            # → 🏠 Chores
```

---

## 📊 Built-in Monitoring

Zero-dependency performance monitoring:

```typescript
import { Server } from 'vafast';
import { withMonitoring } from 'vafast/monitoring';

const server = new Server(routes);
const monitored = withMonitoring(server, {
  slowThreshold: 500,
  excludePaths: ['/health']
});

const status = monitored.getMonitoringStatus();
console.log(`P99: ${status.p99}ms, RPS: ${status.rps}`);
```

**Features:**
- P50/P95/P99 percentiles
- Time window stats (1m/5m/1h)
- RPS calculation, status code distribution
- Per-path stats, memory monitoring
- Sampling rate control, path exclusion
- Custom callbacks (onRequest/onSlowRequest)

---

## 📄 License

[MIT](./LICENSE)

---

**Vafast** — Make web development faster, safer, and more efficient!
