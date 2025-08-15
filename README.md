# Vafast
![Cloudflare Workers](https://img.shields.io/badge/Runtime-Workers-F38020?logo=cloudflare&logoColor=white)
![bun](https://img.shields.io/badge/Runtime-Bun-%23000000?logo=bun\&logoColor=white)
![version](https://img.shields.io/npm/v/vafast)
![license](https://img.shields.io/npm/l/vafast)
![stars](https://img.shields.io/github/stars/vafast/vafast?style=social)


> Vafast — 在一个文件中编写高性能API。
专为Bun构建。设计上类型安全。冷启动时间低于1ms。

---

[![文档](https://img.shields.io/badge/docs-vafast.dev-blue?logo=readthedocs)](https://vafast.dev)

## 📚 Vafast 文档

探索Vafast的完整指南 — 一个专为速度、结构和零样板代码而构建的Bun和Edge原生Web框架。

👉 [https://vafast.dev](https://vafast.dev)

---

> ⚡ 亚毫秒级API。一流的副作用控制。
> 👉 [在GitHub上给Vafast加星标](https://github.com/vafast/vafast)  
Vafast是一个声明式、类型安全的Bun框架 — 旨在使副作用显式化，性能可预测。

---

## 🚀 快速开始

```bash
npx create-vafast-app
```

<p align="center"> <img src="./assets/スクリーンショット 2025-06-17 21.58.05.png" width="500" alt="Vafast设置终端截图"> </p> 

选择您的环境：

* **Bun**
* **Cloudflare Workers**

此命令在几秒钟内设置一个可立即运行的Vafast项目。

📣 **喜欢不碍事的极简工具？**
给主Vafast仓库加星标：[https://github.com/vafast/vafast](https://github.com/vafast/vafast)

---

## 📁 您将获得什么

一个零样板项目，专为您的运行时定制：

* 带有工作路由器和`/`端点的`index.ts`
* 运行时配置文件（`bunfig.toml`、`wrangler.toml`）
* 带有最小脚本和依赖项的`package.json`

示例输出：

```bash
✔ 选择您的目标环境: › Bun
✔ 项目文件夹: › my-vafast-app

✅ Vafast应用已在'my-vafast-app'中创建

下一步：

  cd my-vafast-app
  bun install       # 或 npm install
  npm run dev (Bun)      # 或 wrangler dev 
```

---

## 🔧 设计理念

Vafast建立在5个核心原则之上：

1. **代码即结构** — 路由、中间件和逻辑是配置，而不是行为。代码是清单，而不是脚本。
2. **错误即值** — VafastError携带类型、状态和意图。它们被抛出，但不被隐藏。
3. **组合优于约定** — 中间件被显式组合，顺序是契约的一部分。
4. **类型塑造行为** — 您的API的结构和安全性由其类型定义，而不是文档。
5. **专为边缘设计** — 为Bun构建，为fetch优化，诞生于毫秒时代。

---

## ✨ 特性

* ✅ **结构优先路由** — 将整个API定义为单个声明式结构
* ✅ **可组合中间件** — 显式`compose()`流程，无装饰器或全局作用域
* ✅ **结构化错误** — 抛出带有类型、状态和可见性的`VafastError`
* ✅ **内置响应助手** — `json()`、`html()`、`text()`、`error()`等 — 干净且一致
* ✅ **边缘原生执行** — 在Bun、Workers和Deno上即时冷启动和亚毫秒响应
* ✅ **无样板代码** — 无CLI、无配置、无目录规则。只有纯代码。
* ✅ **设计上类型安全** — 路由、处理器、错误，全部由TypeScript塑造

---

## ⚡️ 性能基准测试

所有测试均使用Bun v1.1.0在M2 Pro芯片（macOS）上进行，模拟边缘运行时条件。

| 指标             | 结果             | 解释 |
|--------------------|--------------------|----------------|
| ❄️ 冷启动       | `0.02 ms`           | 🧊 基本上无法测量 — 完美适用于边缘/fetch基础运行时 |
| ⚡️ 首次请求    | `0.79 ms`           | 🚀 突破1ms障碍。适用于延迟关键型API |
| 🔁 请求/秒     | `90,489 rps`        | 🔥 与Hono相当，超过Express 10倍+ |
| 📉 平均延迟      | `0.96 ms`           | ⚡ 负载下亚毫秒 — 适用于交互式应用 |
| 📦 吞吐量       | `10.9 MB/sec`       | 📈 轻松处理大型JSON负载 |
| 🎯 总请求数   | `905,000 in 10s`    | 💪 经过真实世界负载的实战测试 |

> ✨ Vafast专为边缘优先、零预热环境而设计 — 这些数字证明了这一点。

---

## 🧱 Cookie示例

```ts
import { Server,json,setCookie,requireAuth } from "vafast";
import type { Route } from "vafast";

const routes: Route[] = [
  {
    method: "GET",
    path: "/login",
    handler: () => {
      const headers = new Headers();
      headers.append("Set-Cookie", setCookie("auth", "valid-token", {
        httpOnly: true,
        path: "/",
        maxAge: 3600,
      }));
      return json({ message: "已登录" }, 200, headers);
    },
    middleware: [], 
  },
  {
    method: "GET",
    path: "/private",
    handler: () => json({ message: "仅限认证用户的秘密数据" }),
    middleware: [requireAuth], 
  },
];

const server = new Server(routes);

export default {
  fetch: (req: Request) => server.fetch(req),
};
```

---

## 🔥 Vafast哲学 – 结构化简洁性的5大法则

后端应该是透明的、快速的，并且像架构一样设计 — 而不是像魔法。Vafast建立在五个现代原则之上：

1. **结构是真理之源**  
   API被定义为代码，而不是行为。无装饰器，无约定 — 只有您可以阅读的配置。

2. **错误是数据，不是混乱**  
   异常携带类型、状态和可见性。您不捕获它们 — 您设计它们。

3. **组合就是一切**  
   中间件被显式组合。无全局状态，无来自地狱的堆栈跟踪。

4. **专为边缘构建，由类型塑造**  
   Vafast在Bun、Workers和Deno上即时运行。您的类型塑造运行的内容 — 而不是您的文档。

5. **无引导、无样板、无废话**  
   一个文件。无CLI。无隐藏魔法。您写的就是您部署的。

---

## 🔍 Vafast vs Hono vs Elysia — 关键差异

## 🔍 Vafast vs Hono vs Elysia — 2025年重新审视

| 维度            | **Vafast ✨**                                      | **Hono 🌿**                                      | **Elysia 🧠**                                 |
|-----------------|--------------------------------------------------|--------------------------------------------------|----------------------------------------------|
| **哲学**  | 结构和副作用控制                | 简洁性和熟悉性                      | 类型最大化和装饰器DSL            |
| **路由**     | 声明式`Route[]`结构                  | 链式风格`app.get("/foo")`                   | 宏增强的处理器声明          |
| **中间件**  | 显式`compose([...])`，每个路由作用域      | 全局`app.use()`和嵌套路由器           | 插件+生命周期钩子+装饰器        |
| **错误模型** | `VafastError`：带有元数据的结构化错误     | `throw`或`return c.text()`                    | `set.status()`，插件驱动处理   |
| **类型安全** | 类型驱动的配置和处理器（`Route<T>`）     | 中等（上下文特定类型）                | 极其强大，但与工具紧密耦合 |
| **响应API**| `json()`、`error()`作为纯返回值        | `c.json()`、`c.text()`方法                  | `set.response()`副作用注入   |
| **可扩展性**| 中间件和组合原语           | 带有共享上下文的插件                     | 插件+宏+装饰器                |
| **依赖项**| 🟢 零外部运行时依赖                    | 🟡 轻量级                                  | 🔴 重量级：valibot、宏、SWC等          |
| **运行时支持** | ✅ Bun / Workers 　 　　　　　　　　　　　        | ✅ Bun / Node / Workers/ Deno                  | ❌ 仅限Bun，限于SWC宏管道  |
| **理想用户** | API设计师、类型感知极简主义者、边缘开发者| 想要熟悉DX的Express/Deno用户         | 热爱宏和装饰器的TS高级用户  |

> **Vafast**不仅仅是极简 — 它是架构性的。它让您完全控制结构、类型和执行，无需固执己见的工具或隐藏行为。

---

## 📦 安装

```bash
bun add vafast
```

在Workers中使用：

```bash
npm install vafast
```

---

## 🤍 使用场景

Vafast适用于：
* ⚡️ 需要边缘速度API — 在Bun、Workers和Deno上亚毫秒响应时间。

* 📦 想要类型驱动可靠性 — 由类型塑造的API，而不是运行时猜测。

* 🌐 部署在现代运行时 — 以fetch优先运行，随处工作：Bun、Node、Workers、Deno。

* 🧪 考虑副作用设计 — 有意识地控制cookie、头部和认证。

---

## 💥 准备好再次编写真实代码了吗？

> 🚀 如果您厌倦了魔法、宏和单体 — 试试Vafast。
>  
> 👉 **[⭐️ 在GitHub上加星标](https://github.com/vafast/vafast)** 加入这场运动。

[![GitHub Stars](https://img.shields.io/github/stars/vafast/vafast?style=social)](https://github.com/vafast/vafast)

---

## 📜 许可证

Apache 2.0


