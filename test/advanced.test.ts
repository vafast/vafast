import { describe, it, expect, beforeEach } from "bun:test";
import { Server } from "../src";
import type { Route } from "../src";

describe("高级示例", () => {
  describe("文件上传", () => {
    let server: Server;
    let routes: Route[];

    beforeEach(() => {
      routes = [
        {
          method: "GET",
          path: "/upload",
          handler: () =>
            new Response(
              `
            <!DOCTYPE html>
            <html>
              <head><title>文件上传</title></head>
              <body>
                <h1>文件上传示例</h1>
                <form action="/upload" method="post" enctype="multipart/form-data">
                  <input type="file" name="file" required>
                  <button type="submit">上传</button>
                </form>
              </body>
            </html>
          `,
              {
                headers: { "Content-Type": "text/html; charset=utf-8" },
              }
            ),
        },
        {
          method: "POST",
          path: "/upload",
          handler: async (req) => {
            try {
              const formData = await req.formData();
              const file = formData.get("file") as File;

              if (!file) {
                return new Response("没有上传文件", { status: 400 });
              }

              const fileInfo = {
                name: file.name,
                size: file.size,
                type: file.type,
                uploadedAt: new Date().toISOString(),
              };

              return new Response(
                JSON.stringify({
                  message: "文件上传成功",
                  file: fileInfo,
                }),
                {
                  headers: { "Content-Type": "application/json" },
                }
              );
            } catch (error) {
              return new Response("上传失败", { status: 500 });
            }
          },
        },
      ];
      server = new Server(routes);
    });

    it("应该返回上传表单", async () => {
      const request = new Request("http://localhost/upload", { method: "GET" });
      const response = await server.fetch(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("text/html");
      const html = await response.text();
      expect(html).toContain("文件上传示例");
      expect(html).toContain('input type="file"');
    });

    it("应该处理文件上传", async () => {
      const file = new File(["test content"], "test.txt", { type: "text/plain" });
      const formData = new FormData();
      formData.append("file", file);

      const request = new Request("http://localhost/upload", {
        method: "POST",
        body: formData,
      });

      const response = await server.fetch(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe("文件上传成功");
      expect(data.file.name).toBe("test.txt");
      expect(data.file.size).toBe(12);
      expect(data.file.type).toContain("text/plain");
    });

    it("应该为缺少文件返回错误", async () => {
      const formData = new FormData();
      const request = new Request("http://localhost/upload", {
        method: "POST",
        body: formData,
      });

      const response = await server.fetch(request);

      expect(response.status).toBe(400);
      expect(await response.text()).toBe("没有上传文件");
    });
  });

  describe("流式响应", () => {
    let server: Server;
    let routes: Route[];

    beforeEach(() => {
      routes = [
        {
          method: "GET",
          path: "/stream",
          handler: () => {
            const stream = new ReadableStream({
              start(controller) {
                let count = 0;
                const interval = setInterval(() => {
                  count++;
                  const data = `data: ${JSON.stringify({ count, timestamp: Date.now() })}\n\n`;
                  controller.enqueue(new TextEncoder().encode(data));

                  if (count >= 3) {
                    controller.close();
                    clearInterval(interval);
                  }
                }, 10);
              },
            });

            return new Response(stream, {
              headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
              },
            });
          },
        },
        {
          method: "GET",
          path: "/chunked",
          handler: () => {
            const encoder = new TextEncoder();
            let chunkCount = 0;

            const stream = new ReadableStream({
              start(controller) {
                const sendChunk = () => {
                  chunkCount++;
                  const chunk = `Chunk ${chunkCount}: ${new Date().toISOString()}\n`;
                  controller.enqueue(encoder.encode(chunk));

                  if (chunkCount < 3) {
                    setTimeout(sendChunk, 10);
                  } else {
                    controller.close();
                  }
                };

                sendChunk();
              },
            });

            return new Response(stream, {
              headers: { "Content-Type": "text/plain" },
            });
          },
        },
      ];
      server = new Server(routes);
    });

    it("应该返回服务器发送事件流", async () => {
      const request = new Request("http://localhost/stream", { method: "GET" });
      const response = await server.fetch(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("text/event-stream");
      expect(response.headers.get("Cache-Control")).toBe("no-cache");

      const text = await response.text();
      expect(text).toContain("data: ");
      expect(text).toContain("count");
    });

    it("应该返回分块响应", async () => {
      const request = new Request("http://localhost/chunked", { method: "GET" });
      const response = await server.fetch(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("text/plain");

      const text = await response.text();
      expect(text).toContain("Chunk 1:");
      expect(text).toContain("Chunk 2:");
      expect(text).toContain("Chunk 3:");
    });
  });
});
