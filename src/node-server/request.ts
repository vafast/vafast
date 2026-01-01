/**
 * 优化的 Request 代理
 * 延迟创建真实 Request，减少不必要的对象分配
 */

import { Readable } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import type { IncomingMessage } from "node:http";

// 内部 Symbol
const requestCache = Symbol("requestCache");
const incomingKey = Symbol("incoming");
const urlKey = Symbol("url");
const headersKey = Symbol("headers");

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
const proxyMethods = [
  "arrayBuffer",
  "blob",
  "clone",
  "formData",
  "json",
  "text",
];

proxyMethods.forEach((key) => {
  Object.defineProperty(requestPrototype, key, {
    value: function () {
      const self = this as ProxyRequestInternal;
      const req = self._getRequest();
      return (req[key as keyof Request] as () => Promise<unknown>).call(req);
    },
    enumerable: true,
  });
});

// 设置原型链
Object.setPrototypeOf(requestPrototype, Request.prototype);

/**
 * 创建代理 Request
 * @param incoming Node.js IncomingMessage
 * @param defaultHost 默认主机名
 */
export function createProxyRequest(
  incoming: IncomingMessage,
  defaultHost: string,
): Request {
  const req = Object.create(requestPrototype) as ProxyRequestInternal;
  req[incomingKey] = incoming;

  // 构建 URL
  const host = incoming.headers.host || defaultHost;
  const protocol = (incoming.socket as { encrypted?: boolean }).encrypted
    ? "https"
    : "http";
  req[urlKey] = `${protocol}://${host}${incoming.url || "/"}`;

  return req as unknown as Request;
}
