/**
 * 测试辅助工具
 */

import { Server } from "../../src/server";
import type { Route, NestedRoute, Middleware } from "../../src/types";

/**
 * 创建测试服务器
 */
export function createTestServer(
  routes: (Route | NestedRoute)[],
  middleware: Middleware[] = []
): Server {
  const server = new Server(routes);
  middleware.forEach((mw) => server.use(mw));
  return server;
}

/**
 * 创建测试请求
 */
export function createTestRequest(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
    params?: Record<string, string>;
  } = {}
): Request {
  const { method = "GET", body, headers = {}, params } = options;

  const requestInit: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (body && method !== "GET" && method !== "HEAD") {
    requestInit.body = JSON.stringify(body);
  }

  const req = new Request(`http://localhost${path}`, requestInit);

  if (params) {
    (req as unknown as Record<string, unknown>).params = params;
  }

  return req;
}

/**
 * 创建 JSON 请求
 */
export function createJsonRequest(
  path: string,
  body: unknown,
  method = "POST"
): Request {
  return createTestRequest(path, { method, body });
}

/**
 * 创建带认证的请求
 */
export function createAuthRequest(
  path: string,
  token: string,
  options: {
    method?: string;
    body?: unknown;
  } = {}
): Request {
  return createTestRequest(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

/**
 * 解析 JSON 响应
 */
export async function parseJsonResponse<T = unknown>(
  response: Response
): Promise<{ status: number; data: T; headers: Headers }> {
  const data = await response.json();
  return {
    status: response.status,
    data: data as T,
    headers: response.headers,
  };
}

/**
 * 断言响应状态
 */
export function assertStatus(response: Response, expected: number): void {
  if (response.status !== expected) {
    throw new Error(
      `Expected status ${expected}, got ${response.status}`
    );
  }
}

/**
 * 断言 JSON 响应
 */
export async function assertJsonResponse<T>(
  response: Response,
  expected: Partial<T>
): Promise<T> {
  const data = await response.json();
  for (const [key, value] of Object.entries(expected)) {
    if ((data as Record<string, unknown>)[key] !== value) {
      throw new Error(
        `Expected ${key} to be ${value}, got ${(data as Record<string, unknown>)[key]}`
      );
    }
  }
  return data as T;
}

/**
 * 延迟函数
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 重复执行测试
 */
export async function repeat(
  times: number,
  fn: (i: number) => Promise<void>
): Promise<void> {
  for (let i = 0; i < times; i++) {
    await fn(i);
  }
}

/**
 * 并发执行测试
 */
export async function concurrent(
  times: number,
  fn: (i: number) => Promise<void>
): Promise<void> {
  await Promise.all(
    Array.from({ length: times }, (_, i) => fn(i))
  );
}

/**
 * 测量执行时间
 */
export async function measureTime<T>(
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  return { result, duration };
}

/**
 * 创建简单的模拟数据库
 */
export function createMockDb<T extends { id: number | string }>(
  initialData: T[] = []
): {
  data: T[];
  findAll: () => T[];
  findById: (id: number | string) => T | undefined;
  create: (item: Omit<T, "id">) => T;
  update: (id: number | string, item: Partial<T>) => T | undefined;
  delete: (id: number | string) => boolean;
  reset: () => void;
} {
  let data = [...initialData];
  let nextId = initialData.length + 1;

  return {
    get data() {
      return data;
    },
    findAll: () => [...data],
    findById: (id) => data.find((item) => item.id === id),
    create: (item) => {
      const newItem = { ...item, id: nextId++ } as T;
      data.push(newItem);
      return newItem;
    },
    update: (id, updates) => {
      const index = data.findIndex((item) => item.id === id);
      if (index === -1) return undefined;
      data[index] = { ...data[index], ...updates };
      return data[index];
    },
    delete: (id) => {
      const index = data.findIndex((item) => item.id === id);
      if (index === -1) return false;
      data.splice(index, 1);
      return true;
    },
    reset: () => {
      data = [...initialData];
      nextId = initialData.length + 1;
    },
  };
}

/**
 * 创建测试用日志收集器
 */
export function createLogCollector(): {
  logs: string[];
  log: (...args: unknown[]) => void;
  clear: () => void;
  has: (text: string) => boolean;
} {
  const logs: string[] = [];

  return {
    logs,
    log: (...args) => {
      logs.push(args.map(String).join(" "));
    },
    clear: () => {
      logs.length = 0;
    },
    has: (text) => logs.some((log) => log.includes(text)),
  };
}
