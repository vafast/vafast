/**
 * 优化的 Request 代理
 * 延迟创建真实 Request，减少不必要的对象分配
 */

import { Readable } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import type { IncomingMessage } from "node:http";
import type { Socket } from "node:net";

// 内部 Symbol
const requestCache = Symbol("requestCache");
const incomingKey = Symbol("incoming");
const urlKey = Symbol("url");
const headersKey = Symbol("headers");
const ipKey = Symbol("ip");
const ipsKey = Symbol("ips");

/** 信任代理配置类型 */
export type TrustProxyOption = boolean | string | string[];

/**
 * IP 解析优先级列表
 * 参考业界标准和各大云厂商
 */
const IP_HEADERS = [
  "x-forwarded-for",      // 标准代理头（优先级最高）
  "x-real-ip",            // Nginx
  "x-client-ip",          // Apache
  "cf-connecting-ip",     // Cloudflare
  "fastly-client-ip",     // Fastly
  "x-cluster-client-ip",  // GCP
  "true-client-ip",       // Akamai & Cloudflare
  "fly-client-ip",        // Fly.io
  "x-forwarded",          // RFC 7239
  "forwarded-for",        // RFC 7239
  "forwarded",            // RFC 7239
  "appengine-user-ip",    // GCP AppEngine
  "cf-pseudo-ipv4",       // Cloudflare IPv6 兼容
];

/**
 * 检查 IP 是否在 CIDR 范围内
 */
function isIpInCidr(ip: string, cidr: string): boolean {
  // 简单实现：只支持精确匹配和 /8, /16, /24 掩码
  if (!cidr.includes("/")) {
    return ip === cidr;
  }
  
  const [network, maskStr] = cidr.split("/");
  const mask = parseInt(maskStr, 10);
  
  const ipParts = ip.split(".").map(Number);
  const networkParts = network.split(".").map(Number);
  
  if (ipParts.length !== 4 || networkParts.length !== 4) {
    return false;
  }
  
  const ipNum = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
  const networkNum = (networkParts[0] << 24) | (networkParts[1] << 16) | (networkParts[2] << 8) | networkParts[3];
  const maskNum = ~((1 << (32 - mask)) - 1);
  
  return (ipNum & maskNum) === (networkNum & maskNum);
}

/**
 * 检查是否应该信任代理
 */
function shouldTrustProxy(
  socketIp: string | undefined,
  trustProxy: TrustProxyOption,
): boolean {
  if (trustProxy === true) return true;
  if (trustProxy === false || !trustProxy) return false;
  if (!socketIp) return false;
  
  const trustedList = Array.isArray(trustProxy) ? trustProxy : [trustProxy];
  return trustedList.some((trusted) => isIpInCidr(socketIp, trusted));
}

/**
 * 从请求头解析客户端 IP
 */
function parseClientIp(
  incoming: IncomingMessage,
  trustProxy: TrustProxyOption,
): { ip: string; ips: string[] } {
  const socket = incoming.socket as Socket;
  const socketIp = socket.remoteAddress || "";
  
  // 如果不信任代理，直接返回 socket IP
  if (!shouldTrustProxy(socketIp, trustProxy)) {
    return { ip: socketIp, ips: [socketIp] };
  }
  
  // 尝试从各种头中获取 IP
  for (const header of IP_HEADERS) {
    const value = incoming.headers[header];
    if (value) {
      const headerValue = Array.isArray(value) ? value[0] : value;
      // X-Forwarded-For 可能包含多个 IP，逗号分隔
      if (header === "x-forwarded-for") {
        const ips = headerValue.split(",").map((ip) => ip.trim()).filter(Boolean);
        if (ips.length > 0) {
          return { ip: ips[0], ips };
        }
      } else {
        return { ip: headerValue.trim(), ips: [headerValue.trim()] };
      }
    }
  }
  
  // 回退到 socket IP
  return { ip: socketIp, ips: [socketIp] };
}

/**
 * 从 rawHeaders 高效解析 Headers
 */
function parseHeaders(rawHeaders: string[]): Headers {
  const headers = new Headers();
  for (let i = 0; i < rawHeaders.length; i += 2) {
    const key = rawHeaders[i];
    const value = rawHeaders[i + 1];
    // 跳过 HTTP/2 伪头 (以 : 开头)
    if (key.charCodeAt(0) !== 58) {
      headers.append(key, value);
    }
  }
  return headers;
}

/**
 * 将 Node.js ReadableStream 转换为 Web 标准 ReadableStream
 * Node.js 和 Web 标准的 ReadableStream 在运行时兼容，但 TypeScript 类型不同
 */
function toWebStream(
  nodeStream: NodeReadableStream<Uint8Array>,
): ReadableStream<Uint8Array> {
  // Node.js ReadableStream 和 Web ReadableStream 在运行时是兼容的
  // 这里使用类型断言是安全的，因为 Node.js >= 18 的 stream/web 完全实现了 WHATWG Streams 标准
  return nodeStream as unknown as ReadableStream<Uint8Array>;
}

/** 代理 Request 内部接口 */
interface ProxyRequestInternal {
  [requestCache]?: Request;
  [incomingKey]: IncomingMessage;
  [urlKey]: string;
  [headersKey]?: Headers;
  [ipKey]?: string;
  [ipsKey]?: string[];
  _getRequest(): Request;
}

/**
 * 创建真实的 Request 对象
 */
function createRealRequest(proxy: ProxyRequestInternal): Request {
  const incoming = proxy[incomingKey];
  const method = incoming.method || "GET";
  const init: RequestInit & { duplex?: string } = {
    method,
    headers: proxy[headersKey] || parseHeaders(incoming.rawHeaders),
  };

  // 只有非 GET/HEAD 请求才有 body
  if (method !== "GET" && method !== "HEAD") {
    // 使用 Node.js 原生流转换，避免收集 chunks
    const nodeWebStream = Readable.toWeb(
      incoming,
    ) as NodeReadableStream<Uint8Array>;
    init.body = toWebStream(nodeWebStream);
    init.duplex = "half";
  }

  return new Request(proxy[urlKey], init);
}

/**
 * Request 代理原型
 * 使用 Object.defineProperty 定义属性以支持 this 绑定
 */
const requestPrototype: object = {};

// 定义 method 属性
Object.defineProperty(requestPrototype, "method", {
  get() {
    const self = this as ProxyRequestInternal;
    return self[incomingKey].method || "GET";
  },
  enumerable: true,
});

// 定义 url 属性
Object.defineProperty(requestPrototype, "url", {
  get() {
    const self = this as ProxyRequestInternal;
    return self[urlKey];
  },
  enumerable: true,
});

// 定义 headers 属性（延迟解析）
Object.defineProperty(requestPrototype, "headers", {
  get() {
    const self = this as ProxyRequestInternal;
    if (!self[headersKey]) {
      self[headersKey] = parseHeaders(self[incomingKey].rawHeaders);
    }
    return self[headersKey];
  },
  enumerable: true,
});

// 定义 _getRequest 方法（获取或创建真实 Request）
Object.defineProperty(requestPrototype, "_getRequest", {
  value: function () {
    const self = this as ProxyRequestInternal;
    if (!self[requestCache]) {
      self[requestCache] = createRealRequest(self);
    }
    return self[requestCache]!;
  },
  enumerable: false,
});

// 代理需要访问真实 Request 的属性
const proxyGetters = [
  "body",
  "bodyUsed",
  "signal",
  "cache",
  "credentials",
  "destination",
  "integrity",
  "mode",
  "redirect",
  "referrer",
  "referrerPolicy",
  "keepalive",
];

proxyGetters.forEach((key) => {
  Object.defineProperty(requestPrototype, key, {
    get() {
      const self = this as ProxyRequestInternal;
      return self._getRequest()[key as keyof Request];
    },
    enumerable: true,
  });
});

// 代理需要调用真实 Request 的方法
// 注意：对于 body 相关方法（json/text/arrayBuffer/blob/formData），GET/HEAD 请求没有 body
// 直接返回空值，避免用户误调用导致流读取异常
// 这是框架级防御，参考业界标准：Fastify "for GET and HEAD requests, the payload is never parsed"

// 定义 clone 方法（所有请求都可以克隆）
Object.defineProperty(requestPrototype, "clone", {
  value: function () {
    const self = this as ProxyRequestInternal;
    const req = self._getRequest();
    return req.clone();
  },
  enumerable: true,
});

// 定义 body 相关方法（GET/HEAD 返回空值）
const bodyMethods = ["arrayBuffer", "blob", "formData", "json", "text"] as const;

bodyMethods.forEach((key) => {
  Object.defineProperty(requestPrototype, key, {
    value: function () {
      const self = this as ProxyRequestInternal;
      const method = self[incomingKey].method || "GET";
      
      // GET/HEAD 请求没有 body，直接返回空值
      // 这样即使用户误调用 req.json() 也不会出错
      if (method === "GET" || method === "HEAD") {
        // json() 返回 null，text() 返回空字符串，其他返回对应的空值
        if (key === "json") return Promise.resolve(null);
        if (key === "text") return Promise.resolve("");
        if (key === "arrayBuffer") return Promise.resolve(new ArrayBuffer(0));
        if (key === "blob") return Promise.resolve(new Blob([]));
        if (key === "formData") return Promise.resolve(new FormData());
      }
      
      // 其他请求正常处理
      const req = self._getRequest();
      return (req[key as keyof Request] as () => Promise<unknown>).call(req);
    },
    enumerable: true,
  });
});

// 定义 ip 属性（客户端真实 IP）
Object.defineProperty(requestPrototype, "ip", {
  get() {
    const self = this as ProxyRequestInternal;
    return self[ipKey] || "";
  },
  enumerable: true,
});

// 定义 ips 属性（代理链中的所有 IP）
Object.defineProperty(requestPrototype, "ips", {
  get() {
    const self = this as ProxyRequestInternal;
    return self[ipsKey] || [];
  },
  enumerable: true,
});

// 设置原型链
Object.setPrototypeOf(requestPrototype, Request.prototype);

/** 创建代理 Request 的选项 */
export interface CreateProxyRequestOptions {
  /** 信任代理配置 */
  trustProxy?: TrustProxyOption;
}

/**
 * 创建代理 Request
 * @param incoming Node.js IncomingMessage
 * @param defaultHost 默认主机名
 * @param options 可选配置
 */
export function createProxyRequest(
  incoming: IncomingMessage,
  defaultHost: string,
  options?: CreateProxyRequestOptions,
): Request {
  const req = Object.create(requestPrototype) as ProxyRequestInternal;
  req[incomingKey] = incoming;

  // 构建 URL
  const host = incoming.headers.host || defaultHost;
  const protocol = (incoming.socket as { encrypted?: boolean }).encrypted
    ? "https"
    : "http";
  req[urlKey] = `${protocol}://${host}${incoming.url || "/"}`;

  // 解析客户端 IP（如果启用了 trustProxy）
  if (options?.trustProxy) {
    const { ip, ips } = parseClientIp(incoming, options.trustProxy);
    req[ipKey] = ip;
    req[ipsKey] = ips;
  } else {
    // 默认使用 socket IP
    const socketIp = (incoming.socket as Socket).remoteAddress || "";
    req[ipKey] = socketIp;
    req[ipsKey] = [socketIp];
  }

  return req as unknown as Request;
}
