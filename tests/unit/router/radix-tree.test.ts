/**
 * Radix Tree 路由器单元测试
 * 
 * 参考业界路由器实现（Hono, Fastify find-my-way, Express path-to-regexp）
 * 覆盖各种场景确保路由器的健壮性
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { RadixRouter } from "../../../src/router/radix-tree";

describe("RadixRouter", () => {
  let router: RadixRouter;

  beforeEach(() => {
    router = new RadixRouter();
  });

  // ============================================================================
  // 1. 基础功能测试
  // ============================================================================
  
  describe("1. 静态路由匹配", () => {
    it("应该匹配根路径", () => {
      const handler = () => new Response("root");
      router.register("GET", "/", handler);

      const result = router.match("GET", "/");

      expect(result).not.toBeNull();
      expect(result!.handler).toBe(handler);
      expect(result!.params).toEqual({});
    });

    it("应该匹配简单静态路径", () => {
      const handler = () => new Response("users");
      router.register("GET", "/users", handler);

      const result = router.match("GET", "/users");

      expect(result).not.toBeNull();
      expect(result!.handler).toBe(handler);
    });

    it("应该匹配多段静态路径", () => {
      const handler = () => new Response("api users list");
      router.register("GET", "/api/v1/users/list", handler);

      const result = router.match("GET", "/api/v1/users/list");

      expect(result).not.toBeNull();
      expect(result!.handler).toBe(handler);
    });

    it("应该区分相似路径", () => {
      const usersHandler = () => new Response("users");
      const userHandler = () => new Response("user");
      const userInfoHandler = () => new Response("userInfo");
      
      router.register("GET", "/users", usersHandler);
      router.register("GET", "/user", userHandler);
      router.register("GET", "/userInfo", userInfoHandler);

      expect(router.match("GET", "/users")!.handler).toBe(usersHandler);
      expect(router.match("GET", "/user")!.handler).toBe(userHandler);
      expect(router.match("GET", "/userInfo")!.handler).toBe(userInfoHandler);
    });

    it("不应匹配不存在的路径", () => {
      router.register("GET", "/users", () => new Response("users"));

      expect(router.match("GET", "/posts")).toBeNull();
      expect(router.match("GET", "/user")).toBeNull();
      expect(router.match("GET", "/users/extra")).toBeNull();
    });

    it("不应匹配错误的 HTTP 方法", () => {
      router.register("GET", "/users", () => new Response("users"));

      expect(router.match("POST", "/users")).toBeNull();
      expect(router.match("PUT", "/users")).toBeNull();
      expect(router.match("DELETE", "/users")).toBeNull();
    });

    it("深层静态路径", () => {
      const handler = () => new Response("deep");
      router.register("GET", "/a/b/c/d/e/f/g/h/i/j", handler);

      const result = router.match("GET", "/a/b/c/d/e/f/g/h/i/j");
      expect(result).not.toBeNull();
      expect(result!.handler).toBe(handler);

      // 部分路径不匹配
      expect(router.match("GET", "/a/b/c/d/e")).toBeNull();
    });
  });

  describe("2. 动态参数匹配", () => {
    it("应该匹配单个动态参数", () => {
      const handler = () => new Response("user");
      router.register("GET", "/users/:id", handler);

      const result = router.match("GET", "/users/123");

      expect(result).not.toBeNull();
      expect(result!.params).toEqual({ id: "123" });
    });

    it("应该匹配多个动态参数", () => {
      const handler = () => new Response("post comment");
      router.register("GET", "/posts/:postId/comments/:commentId", handler);

      const result = router.match("GET", "/posts/10/comments/5");

      expect(result).not.toBeNull();
      expect(result!.params).toEqual({ postId: "10", commentId: "5" });
    });

    it("应该正确处理混合静态和动态路径", () => {
      const handler = () => new Response("user profile");
      router.register("GET", "/users/:id/profile", handler);

      const result = router.match("GET", "/users/456/profile");

      expect(result).not.toBeNull();
      expect(result!.params).toEqual({ id: "456" });
    });

    it("动态参数应该能匹配任意字符", () => {
      const handler = () => new Response("user");
      router.register("GET", "/users/:id", handler);

      // 各种格式的 ID
      expect(router.match("GET", "/users/123")!.params).toEqual({ id: "123" });
      expect(router.match("GET", "/users/abc")!.params).toEqual({ id: "abc" });
      expect(router.match("GET", "/users/abc-123_xyz")!.params).toEqual({ id: "abc-123_xyz" });
      expect(router.match("GET", "/users/user@email.com")!.params).toEqual({ id: "user@email.com" });
      expect(router.match("GET", "/users/UUID-1234-5678")!.params).toEqual({ id: "UUID-1234-5678" });
    });

    it("三个连续动态参数", () => {
      router.register("GET", "/:org/:repo/:branch", () => new Response(""));

      const result = router.match("GET", "/facebook/react/main");
      expect(result!.params).toEqual({ org: "facebook", repo: "react", branch: "main" });
    });

    it("参数值包含数字和特殊字符", () => {
      router.register("GET", "/files/:filename", () => new Response(""));

      expect(router.match("GET", "/files/report-2024.pdf")!.params).toEqual({ filename: "report-2024.pdf" });
      expect(router.match("GET", "/files/my_file.tar.gz")!.params).toEqual({ filename: "my_file.tar.gz" });
      expect(router.match("GET", "/files/123")!.params).toEqual({ filename: "123" });
    });

    it("复杂混合模式", () => {
      router.register("GET", "/api/v1/:resource/:id/actions/:action", () => new Response(""));

      const result = router.match("GET", "/api/v1/users/123/actions/activate");
      expect(result!.params).toEqual({ resource: "users", id: "123", action: "activate" });
    });
  });

  describe("3. 通配符匹配", () => {
    it("应该匹配匿名通配符路径", () => {
      const handler = () => new Response("files");
      router.register("GET", "/files/*", handler);

      const result = router.match("GET", "/files/path/to/file.txt");

      expect(result).not.toBeNull();
      expect(result!.params).toEqual({ "*": "path/to/file.txt" });
    });

    it("应该匹配命名通配符 *filepath", () => {
      const handler = () => new Response("static");
      router.register("GET", "/static/*filepath", handler);

      const result = router.match("GET", "/static/assets/css/style.css");

      expect(result).not.toBeNull();
      expect(result!.params).toEqual({ filepath: "assets/css/style.css" });
    });

    it("命名通配符可以匹配单个路径段（也捕获剩余所有）", () => {
      const handler = () => new Response("download");
      router.register("GET", "/download/*file", handler);

      // 单个路径段
      const result = router.match("GET", "/download/image.png");
      expect(result).not.toBeNull();
      expect(result!.params).toEqual({ file: "image.png" });
      
      // 多个路径段也可以匹配
      const result2 = router.match("GET", "/download/path/to/image.png");
      expect(result2).not.toBeNull();
      expect(result2!.params).toEqual({ file: "path/to/image.png" });
    });

    it("命名通配符应该支持深层路径", () => {
      const handler = () => new Response("assets");
      router.register("GET", "/api/*rest", handler);

      const result = router.match("GET", "/api/v1/users/123/profile");

      expect(result).not.toBeNull();
      expect(result!.params).toEqual({ rest: "v1/users/123/profile" });
    });

    it("通配符捕获剩余所有路径", () => {
      router.register("GET", "/cdn/*path", () => new Response(""));

      expect(router.match("GET", "/cdn/images/logo.png")!.params).toEqual({ path: "images/logo.png" });
      expect(router.match("GET", "/cdn/js/app/main.js")!.params).toEqual({ path: "js/app/main.js" });
      expect(router.match("GET", "/cdn/a/b/c/d/e/f")!.params).toEqual({ path: "a/b/c/d/e/f" });
    });

    it("动态参数 + 通配符混合", () => {
      router.register("GET", "/repos/:owner/*path", () => new Response(""));

      const result = router.match("GET", "/repos/facebook/src/components/Button.tsx");
      expect(result!.params).toEqual({ owner: "facebook", path: "src/components/Button.tsx" });
    });

    it("通配符需要至少一个路径段", () => {
      router.register("GET", "/files/*path", () => new Response(""));
      router.register("GET", "/files", () => new Response("list"));

      // /files 匹配静态路由
      expect(router.match("GET", "/files")).not.toBeNull();
      // /files/ 末尾斜杠被过滤，也匹配静态路由
      expect(router.match("GET", "/files/")).not.toBeNull();
      // /files/x 匹配通配符
      expect(router.match("GET", "/files/x")!.params).toEqual({ path: "x" });
    });
  });

  // ============================================================================
  // 2. 路由优先级测试（参考 Hono/Fastify）
  // ============================================================================

  describe("4. 路由优先级", () => {
    describe("静态 > 动态 > 通配符", () => {
      it("静态路由优先于动态路由", () => {
        const staticHandler = () => new Response("static");
        const dynamicHandler = () => new Response("dynamic");

        router.register("GET", "/users/admin", staticHandler);
        router.register("GET", "/users/:id", dynamicHandler);

        expect(router.match("GET", "/users/admin")!.handler).toBe(staticHandler);
        expect(router.match("GET", "/users/123")!.handler).toBe(dynamicHandler);
        expect(router.match("GET", "/users/other")!.handler).toBe(dynamicHandler);
      });

      it("动态路由优先于通配符", () => {
        const paramHandler = () => new Response("param");
        const wildcardHandler = () => new Response("wildcard");

        router.register("GET", "/files/:filename", paramHandler);
        router.register("GET", "/files/*", wildcardHandler);

        expect(router.match("GET", "/files/test.txt")!.handler).toBe(paramHandler);
        expect(router.match("GET", "/files/path/to/file")!.handler).toBe(wildcardHandler);
      });

      it("优先级：静态 > 动态 > 通配符（完整测试）", () => {
        const staticHandler = () => new Response("static");
        const dynamicHandler = () => new Response("dynamic");
        const wildcardHandler = () => new Response("wildcard");

        router.register("GET", "/api/health", staticHandler);
        router.register("GET", "/api/:resource", dynamicHandler);
        router.register("GET", "/api/*", wildcardHandler);

        expect(router.match("GET", "/api/health")!.handler).toBe(staticHandler);
        expect(router.match("GET", "/api/users")!.handler).toBe(dynamicHandler);
        expect(router.match("GET", "/api/users/123")!.handler).toBe(wildcardHandler);
      });
    });

    describe("注册顺序不影响优先级", () => {
      it("先注册动态，后注册静态", () => {
        const dynamicHandler = () => new Response("dynamic");
        const staticHandler = () => new Response("static");

        // 先注册动态路由
        router.register("GET", "/users/:id", dynamicHandler);
        // 后注册静态路由
        router.register("GET", "/users/me", staticHandler);

        // 静态路由仍应优先
        expect(router.match("GET", "/users/me")!.handler).toBe(staticHandler);
        expect(router.match("GET", "/users/123")!.handler).toBe(dynamicHandler);
      });

      it("先注册通配符，后注册动态", () => {
        const wildcardHandler = () => new Response("wildcard");
        const dynamicHandler = () => new Response("dynamic");

        router.register("GET", "/files/*", wildcardHandler);
        router.register("GET", "/files/:filename", dynamicHandler);

        expect(router.match("GET", "/files/test.txt")!.handler).toBe(dynamicHandler);
        expect(router.match("GET", "/files/a/b/c")!.handler).toBe(wildcardHandler);
      });

      it("乱序注册（静态、动态、通配符）", () => {
        const h1 = () => new Response("wildcard");
        const h2 = () => new Response("static");
        const h3 = () => new Response("dynamic");

        // 乱序注册
        router.register("GET", "/api/*", h1);
        router.register("GET", "/api/health", h2);
        router.register("GET", "/api/:id", h3);

        expect(router.match("GET", "/api/health")!.handler).toBe(h2);
        expect(router.match("GET", "/api/123")!.handler).toBe(h3);
        expect(router.match("GET", "/api/a/b")!.handler).toBe(h1);
      });
    });

    describe("复杂优先级场景", () => {
      it("多层静态优先", () => {
        const h1 = () => new Response("h1");
        const h2 = () => new Response("h2");
        const h3 = () => new Response("h3");

        router.register("GET", "/users/:id/posts", h1);
        router.register("GET", "/users/admin/posts", h2);
        router.register("GET", "/users/:id/posts/:postId", h3);

        expect(router.match("GET", "/users/admin/posts")!.handler).toBe(h2);
        expect(router.match("GET", "/users/123/posts")!.handler).toBe(h1);
        expect(router.match("GET", "/users/123/posts/456")!.handler).toBe(h3);
      });

      it("深层嵌套优先级", () => {
        const h1 = () => new Response("exact");
        const h2 = () => new Response("param");
        const h3 = () => new Response("wildcard");

        router.register("GET", "/api/v1/users/list", h1);
        router.register("GET", "/api/v1/users/:id", h2);
        router.register("GET", "/api/v1/*", h3);

        expect(router.match("GET", "/api/v1/users/list")!.handler).toBe(h1);
        expect(router.match("GET", "/api/v1/users/123")!.handler).toBe(h2);
        expect(router.match("GET", "/api/v1/other/path")!.handler).toBe(h3);
      });
    });
  });

  // ============================================================================
  // 3. 同一位置不同参数名（我们修复的核心功能）
  // ============================================================================

  describe("5. 同一位置不同参数名（参考 Hono/Fastify 最佳实践）", () => {
    it("基础场景：同一位置不同参数名", () => {
      const updateHandler = () => new Response("update");
      const messagesHandler = () => new Response("messages");

      router.register("PUT", "/sessions/:id", updateHandler);
      router.register("GET", "/sessions/:sessionId/messages", messagesHandler);

      const updateResult = router.match("PUT", "/sessions/123");
      expect(updateResult!.handler).toBe(updateHandler);
      expect(updateResult!.params).toEqual({ id: "123" });

      const messagesResult = router.match("GET", "/sessions/456/messages");
      expect(messagesResult!.handler).toBe(messagesHandler);
      expect(messagesResult!.params).toEqual({ sessionId: "456" });
    });

    it("复杂嵌套场景", () => {
      const listHandler = () => new Response("list");
      const detailHandler = () => new Response("detail");
      const commentsHandler = () => new Response("comments");
      const commentDetailHandler = () => new Response("commentDetail");

      router.register("GET", "/posts", listHandler);
      router.register("GET", "/posts/:postId", detailHandler);
      router.register("GET", "/posts/:id/comments", commentsHandler);
      router.register("GET", "/posts/:articleId/comments/:commentId", commentDetailHandler);

      expect(router.match("GET", "/posts")!.params).toEqual({});
      expect(router.match("GET", "/posts/100")!.params).toEqual({ postId: "100" });
      expect(router.match("GET", "/posts/200/comments")!.params).toEqual({ id: "200" });
      expect(router.match("GET", "/posts/300/comments/50")!.params).toEqual({ articleId: "300", commentId: "50" });
    });

    it("CRUD 完整场景（实际业务模拟）", () => {
      router.register("GET", "/users", () => new Response("list"));
      router.register("POST", "/users", () => new Response("create"));
      router.register("GET", "/users/:userId", () => new Response("read"));
      router.register("PUT", "/users/:id", () => new Response("update"));
      router.register("DELETE", "/users/:uid", () => new Response("delete"));
      router.register("GET", "/users/:userId/posts", () => new Response("userPosts"));

      expect(router.match("GET", "/users/1")!.params).toEqual({ userId: "1" });
      expect(router.match("PUT", "/users/2")!.params).toEqual({ id: "2" });
      expect(router.match("DELETE", "/users/3")!.params).toEqual({ uid: "3" });
      expect(router.match("GET", "/users/4/posts")!.params).toEqual({ userId: "4" });
    });

    it("同一方法，同一位置，不同深度", () => {
      router.register("GET", "/api/:version", () => new Response(""));
      router.register("GET", "/api/:v/users", () => new Response(""));
      router.register("GET", "/api/:ver/users/:userId", () => new Response(""));

      expect(router.match("GET", "/api/v1")!.params).toEqual({ version: "v1" });
      expect(router.match("GET", "/api/v2/users")!.params).toEqual({ v: "v2" });
      expect(router.match("GET", "/api/v3/users/123")!.params).toEqual({ ver: "v3", userId: "123" });
    });

    it("三个不同参数名在同一位置", () => {
      router.register("GET", "/items/:itemId", () => new Response(""));
      router.register("POST", "/items/:id", () => new Response(""));
      router.register("DELETE", "/items/:item_id", () => new Response(""));

      expect(router.match("GET", "/items/100")!.params).toEqual({ itemId: "100" });
      expect(router.match("POST", "/items/200")!.params).toEqual({ id: "200" });
      expect(router.match("DELETE", "/items/300")!.params).toEqual({ item_id: "300" });
    });

    it("多层不同参数名", () => {
      router.register("GET", "/:a/:b/:c", () => new Response(""));
      router.register("POST", "/:x/:y/:z", () => new Response(""));
      router.register("PUT", "/:foo/:bar/:baz", () => new Response(""));

      expect(router.match("GET", "/1/2/3")!.params).toEqual({ a: "1", b: "2", c: "3" });
      expect(router.match("POST", "/1/2/3")!.params).toEqual({ x: "1", y: "2", z: "3" });
      expect(router.match("PUT", "/1/2/3")!.params).toEqual({ foo: "1", bar: "2", baz: "3" });
    });
  });

  // ============================================================================
  // 4. 回溯匹配测试（重要！）
  // ============================================================================

  describe("6. 回溯匹配", () => {
    it("基础回溯：静态回溯到动态", () => {
      router.register("GET", "/users/admin/settings", () => new Response("adminSettings"));
      router.register("GET", "/users/:id/profile", () => new Response("userProfile"));

      // 应该匹配 adminSettings（静态优先）
      expect(router.match("GET", "/users/admin/settings")).not.toBeNull();
      
      // /users/admin/profile 不匹配 adminSettings，回溯到 :id/profile
      const result = router.match("GET", "/users/admin/profile");
      expect(result).not.toBeNull();
      expect(result!.params).toEqual({ id: "admin" });
    });

    it("深层回溯", () => {
      router.register("GET", "/api/v1/users/list", () => new Response("list"));
      router.register("GET", "/api/v1/users/:id", () => new Response("user"));
      router.register("GET", "/api/:version/admin", () => new Response("admin"));

      // 精确匹配
      expect(router.match("GET", "/api/v1/users/list")).not.toBeNull();
      
      // 动态匹配
      expect(router.match("GET", "/api/v1/users/123")!.params).toEqual({ id: "123" });
      
      // 需要回溯的场景
      expect(router.match("GET", "/api/v2/admin")!.params).toEqual({ version: "v2" });
    });

    it("回溯后参数值正确", () => {
      router.register("GET", "/api/:version/users/:userId/profile", () => new Response("profile"));
      router.register("GET", "/api/:v/admin", () => new Response("admin"));

      const profileResult = router.match("GET", "/api/v1/users/100/profile");
      expect(profileResult!.params).toEqual({ version: "v1", userId: "100" });

      const adminResult = router.match("GET", "/api/v2/admin");
      expect(adminResult!.params).toEqual({ v: "v2" });
    });

    it("多次回溯", () => {
      router.register("GET", "/a/b/c/d", () => new Response("exact"));
      router.register("GET", "/a/b/c/:id", () => new Response("c_param"));
      router.register("GET", "/a/b/:id/x", () => new Response("b_param"));
      router.register("GET", "/a/:id/y/z", () => new Response("a_param"));

      expect(router.match("GET", "/a/b/c/d")).not.toBeNull();
      expect(router.match("GET", "/a/b/c/123")!.params).toEqual({ id: "123" });
      expect(router.match("GET", "/a/b/foo/x")!.params).toEqual({ id: "foo" });
      expect(router.match("GET", "/a/bar/y/z")!.params).toEqual({ id: "bar" });
    });

    it("回溯到通配符", () => {
      router.register("GET", "/files/:filename", () => new Response("file"));
      router.register("GET", "/files/*path", () => new Response("path"));

      expect(router.match("GET", "/files/test.txt")!.params).toEqual({ filename: "test.txt" });
      expect(router.match("GET", "/files/dir/subdir/file.txt")!.params).toEqual({ path: "dir/subdir/file.txt" });
    });

    it("复杂回溯：静态优先但匹配失败后回溯", () => {
      // 场景：/users/admin/dashboard 静态路由
      // 但访问 /users/admin/profile 应该回溯到 /users/:id/profile
      router.register("GET", "/users/admin/dashboard", () => new Response("dashboard"));
      router.register("GET", "/users/:id/profile", () => new Response("profile"));
      router.register("GET", "/users/:id/settings", () => new Response("settings"));

      // 静态匹配
      expect(router.match("GET", "/users/admin/dashboard")).not.toBeNull();
      
      // 需要回溯：先尝试 /users/admin/... 静态，失败后回溯到 /users/:id/profile
      const profileResult = router.match("GET", "/users/admin/profile");
      expect(profileResult).not.toBeNull();
      expect(profileResult!.params).toEqual({ id: "admin" });

      // 普通动态匹配
      expect(router.match("GET", "/users/123/settings")!.params).toEqual({ id: "123" });
    });

    it("回溯不影响后续匹配", () => {
      router.register("GET", "/a/b/c", () => new Response("abc"));
      router.register("GET", "/a/:x/d", () => new Response("axd"));

      // 第一次匹配，需要回溯
      expect(router.match("GET", "/a/b/d")!.params).toEqual({ x: "b" });
      
      // 第二次匹配，确保回溯没有破坏路由器状态
      expect(router.match("GET", "/a/b/c")).not.toBeNull();
      expect(router.match("GET", "/a/y/d")!.params).toEqual({ x: "y" });
    });
  });

  // ============================================================================
  // 5. HTTP 方法测试
  // ============================================================================

  describe("7. HTTP 方法", () => {
    it("应该支持所有标准 HTTP 方法", () => {
      const methods = [
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "PATCH",
        "OPTIONS",
        "HEAD",
      ] as const;

      methods.forEach((method) => {
        const handler = () => new Response(method);
        router.register(method, `/test/${method.toLowerCase()}`, handler);
      });

      methods.forEach((method) => {
        const result = router.match(method, `/test/${method.toLowerCase()}`);
        expect(result).not.toBeNull();
      });
    });

    it("同一路径可以注册多个方法", () => {
      const getHandler = () => new Response("GET");
      const postHandler = () => new Response("POST");
      const putHandler = () => new Response("PUT");
      const deleteHandler = () => new Response("DELETE");
      const patchHandler = () => new Response("PATCH");

      router.register("GET", "/users", getHandler);
      router.register("POST", "/users", postHandler);
      router.register("PUT", "/users", putHandler);
      router.register("DELETE", "/users", deleteHandler);
      router.register("PATCH", "/users", patchHandler);

      expect(router.match("GET", "/users")!.handler).toBe(getHandler);
      expect(router.match("POST", "/users")!.handler).toBe(postHandler);
      expect(router.match("PUT", "/users")!.handler).toBe(putHandler);
      expect(router.match("DELETE", "/users")!.handler).toBe(deleteHandler);
      expect(router.match("PATCH", "/users")!.handler).toBe(patchHandler);
    });

    it("动态路由下不同方法隔离", () => {
      router.register("GET", "/users/:id", () => new Response("get"));
      router.register("PUT", "/users/:id", () => new Response("put"));
      router.register("DELETE", "/users/:id", () => new Response("delete"));

      expect(router.match("GET", "/users/123")).not.toBeNull();
      expect(router.match("PUT", "/users/123")).not.toBeNull();
      expect(router.match("DELETE", "/users/123")).not.toBeNull();
      expect(router.match("POST", "/users/123")).toBeNull();
    });

    it("HTTP 方法必须完全匹配", () => {
      router.register("GET", "/test", () => new Response(""));
      router.register("POST", "/test", () => new Response(""));
      
      // 完全匹配
      expect(router.match("GET", "/test")).not.toBeNull();
      expect(router.match("POST", "/test")).not.toBeNull();
      
      // 不存在的方法不匹配
      expect(router.match("PUT", "/test")).toBeNull();
      expect(router.match("DELETE", "/test")).toBeNull();
      
      // 注意：TypeScript 类型系统确保 Method 是大写的
      // 运行时如果传入小写会被当作不同的方法，这里不测试因为类型不允许
    });
  });

  // ============================================================================
  // 6. 边界情况测试
  // ============================================================================

  describe("8. 边界情况", () => {
    describe("斜杠处理", () => {
      it("应该处理末尾斜杠", () => {
        router.register("GET", "/users", () => new Response("users"));

        expect(router.match("GET", "/users")).not.toBeNull();
        expect(router.match("GET", "/users/")).not.toBeNull();
      });

      it("应该处理开头斜杠", () => {
        router.register("GET", "/users", () => new Response("users"));

        expect(router.match("GET", "/users")).not.toBeNull();
        // 没有开头斜杠的情况
        expect(router.match("GET", "users")).not.toBeNull();
      });

      it("应该处理多重斜杠", () => {
        router.register("GET", "/users", () => new Response("users"));
        router.register("GET", "/api/users", () => new Response("api/users"));

        expect(router.match("GET", "//users//")).not.toBeNull();
        expect(router.match("GET", "/api//users")).not.toBeNull();
        expect(router.match("GET", "///api///users///")).not.toBeNull();
      });
    });

    describe("特殊字符", () => {
      it("参数值包含连字符", () => {
        router.register("GET", "/users/:id", () => new Response(""));
        expect(router.match("GET", "/users/user-123")!.params).toEqual({ id: "user-123" });
      });

      it("参数值包含下划线", () => {
        router.register("GET", "/users/:id", () => new Response(""));
        expect(router.match("GET", "/users/user_123")!.params).toEqual({ id: "user_123" });
      });

      it("参数值包含点号", () => {
        router.register("GET", "/files/:filename", () => new Response(""));
        expect(router.match("GET", "/files/image.png")!.params).toEqual({ filename: "image.png" });
        expect(router.match("GET", "/files/archive.tar.gz")!.params).toEqual({ filename: "archive.tar.gz" });
      });

      it("参数值包含 @ 符号", () => {
        router.register("GET", "/users/:email", () => new Response(""));
        expect(router.match("GET", "/users/test@example.com")!.params).toEqual({ email: "test@example.com" });
      });

      it("参数值包含加号", () => {
        router.register("GET", "/search/:query", () => new Response(""));
        expect(router.match("GET", "/search/hello+world")!.params).toEqual({ query: "hello+world" });
      });

      it("参数值包含百分号编码", () => {
        router.register("GET", "/files/:name", () => new Response(""));
        expect(router.match("GET", "/files/hello%20world")!.params).toEqual({ name: "hello%20world" });
      });
    });

    describe("空值和极端情况", () => {
      it("空路径匹配根", () => {
        router.register("GET", "/", () => new Response("root"));
        expect(router.match("GET", "/")).not.toBeNull();
        expect(router.match("GET", "")).not.toBeNull();
      });

      it("只有根路径", () => {
        router.register("GET", "/", () => new Response("root"));
        expect(router.match("GET", "/")).not.toBeNull();
        expect(router.match("GET", "/users")).toBeNull();
      });

      it("非常长的路径", () => {
        const longPath = "/a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/p/q/r/s/t/u/v/w/x/y/z";
        router.register("GET", longPath, () => new Response("long"));
        expect(router.match("GET", longPath)).not.toBeNull();
      });

      it("非常长的参数值", () => {
        router.register("GET", "/data/:id", () => new Response(""));
        const longId = "a".repeat(1000);
        expect(router.match("GET", `/data/${longId}`)!.params).toEqual({ id: longId });
      });

      it("Unicode 路径", () => {
        router.register("GET", "/用户/:id", () => new Response(""));
        expect(router.match("GET", "/用户/123")!.params).toEqual({ id: "123" });
      });

      it("Unicode 参数值", () => {
        router.register("GET", "/users/:name", () => new Response(""));
        expect(router.match("GET", "/users/张三")!.params).toEqual({ name: "张三" });
        expect(router.match("GET", "/users/日本語")!.params).toEqual({ name: "日本語" });
      });
    });

    describe("参数名特殊情况", () => {
      it("重复参数名（后面的值覆盖前面的）", () => {
        // 这种情况不推荐，但路由器应该能处理
        router.register("GET", "/users/:id/posts/:id", () => new Response(""));
        
        const result = router.match("GET", "/users/123/posts/456");
        expect(result).not.toBeNull();
        // 两个 :id 都被提取，但只有一个名字，最终值取决于实现
        // 我们的实现按顺序存储，所以 id 会是 "456"（第二个）
        expect(result!.params.id).toBeDefined();
      });

      it("参数名包含数字", () => {
        router.register("GET", "/api/:v1/:id2", () => new Response(""));
        expect(router.match("GET", "/api/test/123")!.params).toEqual({ v1: "test", id2: "123" });
      });

      it("参数名包含下划线", () => {
        router.register("GET", "/users/:user_id/posts/:post_id", () => new Response(""));
        expect(router.match("GET", "/users/1/posts/2")!.params).toEqual({ user_id: "1", post_id: "2" });
      });

      it("单字符参数名", () => {
        router.register("GET", "/:a/:b/:c", () => new Response(""));
        expect(router.match("GET", "/x/y/z")!.params).toEqual({ a: "x", b: "y", c: "z" });
      });

      it("很长的参数名", () => {
        const longParamName = "veryLongParameterNameThatShouldStillWork";
        router.register("GET", `/users/:${longParamName}`, () => new Response(""));
        
        const result = router.match("GET", "/users/123");
        expect(result!.params[longParamName]).toBe("123");
      });
    });

    describe("路径段内容边界", () => {
      it("参数值为数字 0", () => {
        router.register("GET", "/items/:id", () => new Response(""));
        expect(router.match("GET", "/items/0")!.params).toEqual({ id: "0" });
      });

      it("参数值为单个字符", () => {
        router.register("GET", "/char/:c", () => new Response(""));
        expect(router.match("GET", "/char/a")!.params).toEqual({ c: "a" });
        expect(router.match("GET", "/char/0")!.params).toEqual({ c: "0" });
      });

      it("静态路径包含特殊字符", () => {
        router.register("GET", "/api-v1/users_list", () => new Response(""));
        expect(router.match("GET", "/api-v1/users_list")).not.toBeNull();
      });

      it("路径段看起来像参数但实际是静态", () => {
        // 注册一个真正的静态路径，内容恰好是 ":id" 字面量
        // 由于我们的路由器将 : 开头解析为参数，这实际上会变成动态参数
        // 这是预期行为，不是 bug
        router.register("GET", "/literal/:id", () => new Response(""));
        
        // 应该匹配任何值
        expect(router.match("GET", "/literal/123")).not.toBeNull();
        expect(router.match("GET", "/literal/abc")).not.toBeNull();
      });
    });
  });

  // ============================================================================
  // 7. 中间件测试
  // ============================================================================

  describe("9. 中间件支持", () => {
    it("应该正确存储和返回中间件", () => {
      const handler = () => new Response("test");
      const middleware1 = async (req: Request, next: () => Promise<Response>) => next();
      const middleware2 = async (req: Request, next: () => Promise<Response>) => next();

      router.register("GET", "/test", handler, [middleware1, middleware2]);

      const result = router.match("GET", "/test");

      expect(result).not.toBeNull();
      expect(result!.middleware).toHaveLength(2);
      expect(result!.middleware[0]).toBe(middleware1);
      expect(result!.middleware[1]).toBe(middleware2);
    });

    it("没有中间件时应该返回空数组", () => {
      router.register("GET", "/test", () => new Response("test"));

      const result = router.match("GET", "/test");

      expect(result!.middleware).toEqual([]);
    });

    it("不同路由可以有不同中间件", () => {
      const mw1 = async (req: Request, next: () => Promise<Response>) => next();
      const mw2 = async (req: Request, next: () => Promise<Response>) => next();
      const mw3 = async (req: Request, next: () => Promise<Response>) => next();

      router.register("GET", "/a", () => new Response(""), [mw1]);
      router.register("GET", "/b", () => new Response(""), [mw2, mw3]);
      router.register("GET", "/c", () => new Response(""), []);

      expect(router.match("GET", "/a")!.middleware).toEqual([mw1]);
      expect(router.match("GET", "/b")!.middleware).toEqual([mw2, mw3]);
      expect(router.match("GET", "/c")!.middleware).toEqual([]);
    });

    it("动态路由的中间件", () => {
      const mw = async (req: Request, next: () => Promise<Response>) => next();
      router.register("GET", "/users/:id", () => new Response(""), [mw]);

      expect(router.match("GET", "/users/123")!.middleware).toEqual([mw]);
      expect(router.match("GET", "/users/456")!.middleware).toEqual([mw]);
    });
  });

  // ============================================================================
  // 8. 预编译测试
  // ============================================================================

  describe("10. 预编译", () => {
    it("设置编译器", () => {
      const compiler = (middleware: any[], handler: any) => handler;
      router.setCompiler(compiler);
      router.register("GET", "/test", () => new Response(""));

      const result = router.match("GET", "/test");
      expect(result!.compiled).toBeDefined();
    });

    it("预编译所有路由", () => {
      let compileCount = 0;
      const compiler = (middleware: any[], handler: any) => {
        compileCount++;
        return handler;
      };

      router.setCompiler(compiler);
      router.register("GET", "/a", () => new Response(""));
      router.register("GET", "/b", () => new Response(""));
      router.register("GET", "/c", () => new Response(""));

      const globalMiddleware = [async (req: Request, next: () => Promise<Response>) => next()];
      router.precompileAll(globalMiddleware);

      // 每个路由都应该被编译
      expect(compileCount).toBeGreaterThanOrEqual(3);
    });
  });

  // ============================================================================
  // 9. API 完整性测试
  // ============================================================================

  describe("11. getAllowedMethods", () => {
    it("应该返回路径允许的所有方法", () => {
      router.register("GET", "/users", () => new Response("GET"));
      router.register("POST", "/users", () => new Response("POST"));
      router.register("DELETE", "/users", () => new Response("DELETE"));

      const methods = router.getAllowedMethods("/users");

      expect(methods).toContain("GET");
      expect(methods).toContain("POST");
      expect(methods).toContain("DELETE");
      expect(methods).toHaveLength(3);
    });

    it("不存在的路径应该返回空数组", () => {
      router.register("GET", "/users", () => new Response("users"));

      const methods = router.getAllowedMethods("/posts");

      expect(methods).toEqual([]);
    });

    it("动态路径的方法", () => {
      router.register("GET", "/users/:id", () => new Response(""));
      router.register("PUT", "/users/:id", () => new Response(""));

      const methods = router.getAllowedMethods("/users/123");

      expect(methods).toContain("GET");
      expect(methods).toContain("PUT");
      expect(methods).toHaveLength(2);
    });
  });

  describe("12. getRoutes", () => {
    it("应该返回所有注册的路由", () => {
      router.register("GET", "/users", () => new Response(""));
      router.register("POST", "/users", () => new Response(""));
      router.register("GET", "/users/:id", () => new Response(""));
      router.register("GET", "/posts", () => new Response(""));

      const routes = router.getRoutes();

      expect(routes).toHaveLength(4);
    });

    it("应该包含所有类型的路由", () => {
      router.register("GET", "/", () => new Response(""));
      router.register("GET", "/static", () => new Response(""));
      router.register("GET", "/users/:id", () => new Response(""));
      router.register("GET", "/files/*", () => new Response(""));

      const routes = router.getRoutes();

      expect(routes).toHaveLength(4);
    });

    it("空路由器返回空数组", () => {
      const routes = router.getRoutes();
      expect(routes).toEqual([]);
    });
  });

  // ============================================================================
  // 10. 路由冲突和警告测试
  // ============================================================================

  describe("13. 路由冲突", () => {
    it("重复注册同一路由（覆盖）", () => {
      const handler1 = () => new Response("first");
      const handler2 = () => new Response("second");

      router.register("GET", "/test", handler1);
      router.register("GET", "/test", handler2);

      // 后注册的应该覆盖前面的
      expect(router.match("GET", "/test")!.handler).toBe(handler2);
    });

    it("参数名冲突应该输出警告", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      router.register("GET", "/users/:id", () => new Response(""));
      router.register("GET", "/users/:userId/posts", () => new Response(""));

      expect(warnSpy).toHaveBeenCalled();
      expect(warnSpy.mock.calls[0][0]).toContain("路由参数名冲突");

      warnSpy.mockRestore();
    });

    it("参数名冲突不影响功能", () => {
      vi.spyOn(console, "warn").mockImplementation(() => {});

      router.register("GET", "/users/:id", () => new Response(""));
      router.register("GET", "/users/:userId/posts", () => new Response(""));

      // 即使有警告，功能应该正常
      expect(router.match("GET", "/users/123")!.params).toEqual({ id: "123" });
      expect(router.match("GET", "/users/456/posts")!.params).toEqual({ userId: "456" });

      vi.restoreAllMocks();
    });

    it("路由覆盖后参数名应更新", () => {
      const handler1 = () => new Response("first");
      const handler2 = () => new Response("second");

      router.register("GET", "/items/:itemId", handler1);
      // 用不同参数名覆盖
      router.register("GET", "/items/:id", handler2);

      const result = router.match("GET", "/items/123");
      // 应该使用新的 handler
      expect(result!.handler).toBe(handler2);
      // 应该使用新的参数名
      expect(result!.params).toEqual({ id: "123" });
    });

    it("同一动态节点不同方法使用不同参数名", () => {
      vi.spyOn(console, "warn").mockImplementation(() => {});

      router.register("GET", "/resources/:resourceId", () => new Response("get"));
      router.register("POST", "/resources/:id", () => new Response("post"));
      router.register("PUT", "/resources/:res_id", () => new Response("put"));

      // 每个方法应该返回各自定义的参数名
      expect(router.match("GET", "/resources/100")!.params).toEqual({ resourceId: "100" });
      expect(router.match("POST", "/resources/200")!.params).toEqual({ id: "200" });
      expect(router.match("PUT", "/resources/300")!.params).toEqual({ res_id: "300" });

      vi.restoreAllMocks();
    });
  });

  // ============================================================================
  // 11. 性能和压力测试
  // ============================================================================

  describe("14. 大规模路由", () => {
    it("大量静态路由", () => {
      // 注册 1000 个路由
      for (let i = 0; i < 1000; i++) {
        router.register("GET", `/route${i}`, () => new Response(`${i}`));
      }

      // 验证匹配
      expect(router.match("GET", "/route0")).not.toBeNull();
      expect(router.match("GET", "/route500")).not.toBeNull();
      expect(router.match("GET", "/route999")).not.toBeNull();
      expect(router.match("GET", "/route1000")).toBeNull();
    });

    it("大量动态路由", () => {
      for (let i = 0; i < 100; i++) {
        router.register("GET", `/api/v${i}/:resource/:id`, () => new Response(`${i}`));
      }

      expect(router.match("GET", "/api/v50/users/123")).not.toBeNull();
      expect(router.match("GET", "/api/v99/posts/456")).not.toBeNull();
    });

    it("深层嵌套路由", () => {
      // 20 层深度
      let path = "";
      for (let i = 0; i < 20; i++) {
        path += `/level${i}`;
      }
      router.register("GET", path, () => new Response("deep"));

      expect(router.match("GET", path)).not.toBeNull();
    });

    it("混合大量路由仍能正确匹配", () => {
      // 注册 300 个混合路由
      for (let i = 0; i < 100; i++) {
        router.register("GET", `/static${i}`, () => new Response(`static${i}`));
        router.register("GET", `/dynamic${i}/:id`, () => new Response(`dynamic${i}`));
        router.register("GET", `/wildcard${i}/*`, () => new Response(`wildcard${i}`));
      }

      // 验证各种类型路由都能正确匹配
      expect(router.match("GET", "/static0")).not.toBeNull();
      expect(router.match("GET", "/static50")).not.toBeNull();
      expect(router.match("GET", "/static99")).not.toBeNull();
      
      expect(router.match("GET", "/dynamic25/123")!.params).toEqual({ id: "123" });
      expect(router.match("GET", "/dynamic75/abc")!.params).toEqual({ id: "abc" });
      
      expect(router.match("GET", "/wildcard10/a/b/c")!.params).toEqual({ "*": "a/b/c" });
      expect(router.match("GET", "/wildcard90/x/y")!.params).toEqual({ "*": "x/y" });

      // 不存在的路由
      expect(router.match("GET", "/static100")).toBeNull();
      expect(router.match("GET", "/notexist")).toBeNull();
    });
  });

  // ============================================================================
  // 12. 实际业务场景测试
  // ============================================================================

  describe("15. 实际业务场景", () => {
    it("RESTful API 完整场景", () => {
      // 用户资源
      router.register("GET", "/api/users", () => new Response("list users"));
      router.register("POST", "/api/users", () => new Response("create user"));
      router.register("GET", "/api/users/:userId", () => new Response("get user"));
      router.register("PUT", "/api/users/:userId", () => new Response("update user"));
      router.register("DELETE", "/api/users/:userId", () => new Response("delete user"));
      
      // 用户的帖子
      router.register("GET", "/api/users/:userId/posts", () => new Response("user posts"));
      router.register("POST", "/api/users/:userId/posts", () => new Response("create post"));
      
      // 帖子资源
      router.register("GET", "/api/posts/:postId", () => new Response("get post"));
      router.register("PUT", "/api/posts/:postId", () => new Response("update post"));
      router.register("DELETE", "/api/posts/:postId", () => new Response("delete post"));
      
      // 帖子评论
      router.register("GET", "/api/posts/:postId/comments", () => new Response("post comments"));
      router.register("POST", "/api/posts/:postId/comments", () => new Response("create comment"));
      router.register("DELETE", "/api/posts/:postId/comments/:commentId", () => new Response("delete comment"));

      // 验证所有路由
      expect(router.match("GET", "/api/users")).not.toBeNull();
      expect(router.match("POST", "/api/users")).not.toBeNull();
      expect(router.match("GET", "/api/users/123")!.params).toEqual({ userId: "123" });
      expect(router.match("PUT", "/api/users/123")!.params).toEqual({ userId: "123" });
      expect(router.match("DELETE", "/api/users/123")!.params).toEqual({ userId: "123" });
      expect(router.match("GET", "/api/users/123/posts")!.params).toEqual({ userId: "123" });
      expect(router.match("GET", "/api/posts/456")!.params).toEqual({ postId: "456" });
      expect(router.match("GET", "/api/posts/456/comments")!.params).toEqual({ postId: "456" });
      expect(router.match("DELETE", "/api/posts/456/comments/789")!.params).toEqual({ postId: "456", commentId: "789" });
    });

    it("文件服务场景", () => {
      router.register("GET", "/files", () => new Response("list files"));
      router.register("GET", "/files/:fileId", () => new Response("file info"));
      router.register("GET", "/files/:fileId/download", () => new Response("download"));
      router.register("GET", "/static/*filepath", () => new Response("static file"));

      expect(router.match("GET", "/files")).not.toBeNull();
      expect(router.match("GET", "/files/123")!.params).toEqual({ fileId: "123" });
      expect(router.match("GET", "/files/123/download")!.params).toEqual({ fileId: "123" });
      expect(router.match("GET", "/static/css/style.css")!.params).toEqual({ filepath: "css/style.css" });
    });

    it("多租户场景", () => {
      // 同一个位置（根路径后第一段）使用不同参数名
      // 但后续静态路径不同，所以能正确区分
      router.register("GET", "/:tenant/api/users", () => new Response(""));
      router.register("GET", "/:tenant/api/users/:userId", () => new Response(""));
      router.register("GET", "/:org/api/settings", () => new Response(""));  // 注意：后面是 settings 不是 users

      // 匹配用户列表
      expect(router.match("GET", "/acme/api/users")!.params).toEqual({ tenant: "acme" });
      // 匹配具体用户
      expect(router.match("GET", "/acme/api/users/123")!.params).toEqual({ tenant: "acme", userId: "123" });
      // 匹配设置（不同的静态段 "settings" vs "users"）
      // 由于第一段都是动态参数，会复用同一个节点，参数名取决于先注册的
      // 但我们的实现会根据路由定义返回正确的参数名
      expect(router.match("GET", "/corp/api/settings")!.params).toEqual({ org: "corp" });
    });

    it("版本化 API 场景", () => {
      router.register("GET", "/api/v1/users", () => new Response("v1"));
      router.register("GET", "/api/v2/users", () => new Response("v2"));
      router.register("GET", "/api/:version/health", () => new Response("health"));

      expect(router.match("GET", "/api/v1/users")).not.toBeNull();
      expect(router.match("GET", "/api/v2/users")).not.toBeNull();
      expect(router.match("GET", "/api/v3/health")!.params).toEqual({ version: "v3" });
    });

    it("微服务网关场景", () => {
      router.register("GET", "/gateway/:service/*path", () => new Response(""));

      expect(router.match("GET", "/gateway/user-service/api/users")!.params).toEqual({
        service: "user-service",
        path: "api/users"
      });
      expect(router.match("GET", "/gateway/order-service/api/orders/123")!.params).toEqual({
        service: "order-service",
        path: "api/orders/123"
      });
    });

    it("OAuth/认证回调场景", () => {
      router.register("GET", "/auth/callback", () => new Response(""));
      router.register("GET", "/auth/:provider/callback", () => new Response(""));
      router.register("GET", "/auth/:provider/login", () => new Response(""));

      expect(router.match("GET", "/auth/callback")).not.toBeNull();
      expect(router.match("GET", "/auth/google/callback")!.params).toEqual({ provider: "google" });
      expect(router.match("GET", "/auth/github/login")!.params).toEqual({ provider: "github" });
    });

    it("嵌套资源 CRUD（三层嵌套）", () => {
      // 组织 -> 项目 -> 任务
      router.register("GET", "/orgs/:orgId/projects", () => new Response(""));
      router.register("GET", "/orgs/:orgId/projects/:projectId", () => new Response(""));
      router.register("GET", "/orgs/:orgId/projects/:projectId/tasks", () => new Response(""));
      router.register("GET", "/orgs/:orgId/projects/:projectId/tasks/:taskId", () => new Response(""));

      expect(router.match("GET", "/orgs/1/projects")!.params).toEqual({ orgId: "1" });
      expect(router.match("GET", "/orgs/1/projects/2")!.params).toEqual({ orgId: "1", projectId: "2" });
      expect(router.match("GET", "/orgs/1/projects/2/tasks")!.params).toEqual({ orgId: "1", projectId: "2" });
      expect(router.match("GET", "/orgs/1/projects/2/tasks/3")!.params).toEqual({ 
        orgId: "1", projectId: "2", taskId: "3" 
      });
    });

    it("混合静态和动态的 API 版本路由", () => {
      // v1 和 v2 是静态的，其他版本是动态的
      router.register("GET", "/api/v1/users", () => new Response("v1"));
      router.register("GET", "/api/v2/users", () => new Response("v2"));
      router.register("GET", "/api/:version/users", () => new Response("dynamic"));
      router.register("GET", "/api/:version/health", () => new Response("health"));

      // 静态版本优先
      expect(router.match("GET", "/api/v1/users")).not.toBeNull();
      expect(router.match("GET", "/api/v2/users")).not.toBeNull();
      
      // v3 等使用动态版本
      expect(router.match("GET", "/api/v3/users")!.params).toEqual({ version: "v3" });
      expect(router.match("GET", "/api/beta/users")!.params).toEqual({ version: "beta" });
      
      // health 端点
      expect(router.match("GET", "/api/v1/health")!.params).toEqual({ version: "v1" });
    });
  });

  // ============================================================================
  // 16. 错误恢复和鲁棒性测试
  // ============================================================================

  describe("16. 错误恢复和鲁棒性", () => {
    it("连续注册和匹配不会互相影响", () => {
      // 交替注册和匹配
      router.register("GET", "/a", () => new Response("a"));
      expect(router.match("GET", "/a")).not.toBeNull();
      
      router.register("GET", "/b", () => new Response("b"));
      expect(router.match("GET", "/a")).not.toBeNull();
      expect(router.match("GET", "/b")).not.toBeNull();
      
      router.register("GET", "/a/:id", () => new Response("a-id"));
      expect(router.match("GET", "/a")).not.toBeNull();
      expect(router.match("GET", "/a/123")!.params).toEqual({ id: "123" });
    });

    it("大量不匹配的请求不会影响路由器状态", () => {
      router.register("GET", "/exists", () => new Response(""));
      router.register("GET", "/users/:id", () => new Response(""));

      // 大量不匹配请求
      for (let i = 0; i < 100; i++) {
        expect(router.match("GET", "/nonexistent")).toBeNull();
        expect(router.match("POST", "/exists")).toBeNull();
        expect(router.match("GET", "/random/path/that/does/not/exist")).toBeNull();
      }

      // 路由器状态应该不受影响
      expect(router.match("GET", "/exists")).not.toBeNull();
      expect(router.match("GET", "/users/123")!.params).toEqual({ id: "123" });
    });

    it("空字符串路径段被正确过滤", () => {
      router.register("GET", "/api/users", () => new Response(""));

      // 各种包含空段的路径都应该正确匹配
      expect(router.match("GET", "/api/users")).not.toBeNull();
      expect(router.match("GET", "//api//users//")).not.toBeNull();
      expect(router.match("GET", "/api///users")).not.toBeNull();
    });
  });
});
