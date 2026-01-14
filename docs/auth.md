# Vafast 认证系统

Vafast 提供了一个完整的 JWT 风格的认证系统，支持令牌生成、验证、刷新和权限控制。

## 功能特性

- 🔐 **JWT 风格令牌**: 使用 HMAC-SHA256 签名
- ⏰ **自动过期**: 支持令牌过期时间设置
- 🔄 **令牌刷新**: 支持访问令牌和刷新令牌对
- 👥 **角色权限**: 内置角色和权限验证
- 🛡️ **安全中间件**: 灵活的认证中间件系统
- 📱 **多端支持**: 支持 Cookie 和 Authorization Header

## 快速开始

### 1. 基本认证

```typescript
import { createAuth } from "vafast/middleware/auth";
import { generateToken, verifyToken } from "vafast/auth/token";

// 创建认证中间件
const auth = createAuth({ 
  secret: "your-secret-key" 
});

// 生成令牌
const token = await generateToken(
  { userId: "123", role: "user" }, 
  "your-secret-key"
);

// 验证令牌
const payload = await verifyToken(token, "your-secret-key");
```

### 2. 在路由中使用

```typescript
import { Server, defineRoute, defineRoutes } from "vafast";
import { createAuth } from "vafast/middleware/auth";

const auth = createAuth({ secret: "your-secret-key" });

const routes = defineRoutes([
  defineRoute({
    method: "GET",
    path: "/protected",
    middleware: [auth],
    handler: async (req) => {
      // 用户信息通过中间件注入到 req.user
      const user = (req as any).user;
      return new Response(`Hello, ${user.username}!`);
    }
  })
]);

const server = new Server(routes);
```

## API 参考

### 令牌生成

#### `generateToken(payload, secret, options?)`

生成一个新的认证令牌。

**参数:**
- `payload: TokenPayload` - 令牌载荷
- `secret: string` - 签名密钥
- `options?: TokenOptions` - 可选配置

**返回值:**
```typescript
interface TokenResult {
  payload: TokenPayload;
  token: string;
  expiresAt: number;
}
```

**示例:**
```typescript
const result = await generateToken(
  { userId: "123", username: "john" },
  "secret-key",
  { 
    expiresIn: 3600,        // 1小时过期
    issuer: "vafast-api",   // 签发者
    audience: "web-app",    // 受众
    subject: "user123"      // 主题
  }
);

console.log(result.token);        // 令牌字符串
console.log(result.expiresAt);    // 过期时间戳
```

### 令牌验证

#### `verifyToken(token, secret)`

验证令牌的有效性和签名。

**参数:**
- `token: string` - 要验证的令牌
- `secret: string` - 签名密钥

**返回值:**
- `TokenPayload | null` - 验证成功返回载荷，失败返回 null

**错误处理:**
```typescript
try {
  const payload = await verifyToken(token, secret);
  if (payload) {
    console.log("令牌有效:", payload);
  }
} catch (error) {
  if (error instanceof TokenError) {
    switch (error.code) {
      case 'EXPIRED_TOKEN':
        console.log("令牌已过期");
        break;
      case 'INVALID_SIGNATURE':
        console.log("令牌签名无效");
        break;
      case 'MALFORMED_TOKEN':
        console.log("令牌格式错误");
        break;
    }
  }
}
```

### 令牌刷新

#### `refreshToken(token, secret, options?)`

使用刷新令牌生成新的访问令牌。

**参数:**
- `token: string` - 刷新令牌
- `secret: string` - 签名密钥
- `options?: TokenOptions` - 新令牌的配置

**返回值:**
- `TokenResult | null` - 刷新成功返回新令牌，失败返回 null

**示例:**
```typescript
const newToken = await refreshToken(refreshToken, secret, {
  expiresIn: 3600
});

if (newToken) {
  console.log("新访问令牌:", newToken.token);
}
```

### 令牌对创建

#### `createTokenPair(payload, secret, options?)`

创建访问令牌和刷新令牌对。

**参数:**
- `payload: TokenPayload` - 令牌载荷
- `secret: string` - 签名密钥
- `options?: TokenOptions` - 访问令牌配置

**返回值:**
```typescript
{
  accessToken: TokenResult;   // 短期访问令牌
  refreshToken: TokenResult;  // 长期刷新令牌
}
```

**示例:**
```typescript
const tokenPair = await createTokenPair(
  { userId: "123", role: "user" },
  "secret-key",
  { expiresIn: 3600 }  // 访问令牌1小时过期
);

console.log("访问令牌:", tokenPair.accessToken.token);
console.log("刷新令牌:", tokenPair.refreshToken.token);
```

### 工具函数

#### `parseToken(token)`

解析令牌载荷（不验证签名）。

#### `isTokenExpired(token)`

检查令牌是否过期。

#### `getTokenTimeRemaining(token)`

获取令牌剩余有效时间（秒）。

## 认证中间件

### 基本认证

```typescript
import { createAuth } from "vafast/middleware/auth";

const auth = createAuth({
  secret: "your-secret-key",
  cookieName: "auth",           // Cookie 名称
  headerName: "authorization"   // Header 名称
});
```

### 角色验证

```typescript
import { createRoleAuth } from "vafast/middleware/auth";

const adminAuth = createRoleAuth(["admin"], {
  secret: "your-secret-key"
});

const userAuth = createRoleAuth(["user", "admin"], {
  secret: "your-secret-key"
});
```

### 权限验证

```typescript
import { createPermissionAuth } from "vafast/middleware/auth";

const writeAuth = createPermissionAuth(["write"], {
  secret: "your-secret-key"
});

const adminAuth = createPermissionAuth(["admin"], {
  secret: "your-secret-key"
});
```

### 可选认证

```typescript
import { createOptionalAuth } from "vafast/middleware/auth";

const optionalAuth = createOptionalAuth({
  secret: "your-secret-key"
});

// 这个中间件不会阻止未认证的请求
// 但如果提供了有效令牌，会将用户信息注入到 req.user
```

## 错误处理

认证系统使用自定义的 `TokenError` 类来提供详细的错误信息：

```typescript
import { TokenError } from "vafast/auth/token";

// 错误类型
type TokenErrorCode = 
  | 'INVALID_TOKEN'      // 令牌无效
  | 'EXPIRED_TOKEN'      // 令牌过期
  | 'INVALID_SIGNATURE'  // 签名无效
  | 'MALFORMED_TOKEN'    // 格式错误
  | 'INVALID_PAYLOAD';   // 载荷无效

// 错误处理示例
try {
  const payload = await verifyToken(token, secret);
} catch (error) {
  if (error instanceof TokenError) {
    console.log(`认证错误: ${error.message}`);
    console.log(`错误代码: ${error.code}`);
  }
}
```

## 安全最佳实践

### 1. 密钥管理

```typescript
// ✅ 使用环境变量
const SECRET_KEY = process.env.JWT_SECRET || "fallback-secret";

// ❌ 不要在代码中硬编码
const SECRET_KEY = "my-secret-key";
```

### 2. 令牌过期时间

```typescript
// ✅ 合理的过期时间
const accessToken = await generateToken(payload, secret, {
  expiresIn: 3600        // 1小时
});

const refreshToken = await generateToken(payload, secret, {
  expiresIn: 7 * 24 * 3600  // 7天
});
```

### 3. 权限最小化

```typescript
// ✅ 只请求必要的权限
const userAuth = createPermissionAuth(["read"], {
  secret: SECRET_KEY
});

// ❌ 不要过度授权
const userAuth = createPermissionAuth(["read", "write", "delete", "admin"], {
  secret: SECRET_KEY
});
```

### 4. HTTPS 使用

在生产环境中，始终使用 HTTPS 来传输令牌，防止中间人攻击。

## 完整示例

查看 `examples/auth-example.ts` 文件获取完整的认证系统使用示例。

## 测试

运行认证测试：

```bash
npm test tests/unit/auth.test.ts
```

## 类型定义

```typescript
interface TokenPayload {
  [key: string]: any;
  exp?: number;    // 过期时间戳
  iat?: number;    // 签发时间戳
  sub?: string;    // 主题（通常是用户ID）
  aud?: string;    // 受众
  iss?: string;    // 签发者
}

interface TokenOptions {
  expiresIn?: number;   // 过期时间（秒）
  issuer?: string;      // 签发者
  audience?: string;    // 受众
  subject?: string;     // 主题
}

interface TokenResult {
  payload: TokenPayload;
  token: string;
  expiresAt: number;
}
```
