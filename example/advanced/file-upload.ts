import { Server } from "../../src";
import type { Route } from "../../src";

// 文件上传示例
const routes: Route[] = [
  {
    method: "GET",
    path: "/upload",
    handler: () => new Response(`
      <!DOCTYPE html>
      <html>
        <head><title>File Upload</title></head>
        <body>
          <h1>File Upload Example</h1>
          <form action="/upload" method="post" enctype="multipart/form-data">
            <input type="file" name="file" required>
            <button type="submit">Upload</button>
          </form>
        </body>
      </html>
    `, {
      headers: { "Content-Type": "text/html" }
    }),
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
          uploadedAt: new Date().toISOString()
        };
        
        return new Response(JSON.stringify({
          message: "文件上传成功",
          file: fileInfo
        }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        return new Response("上传失败", { status: 500 });
      }
    },
  },
];

const server = new Server(routes);

export default {
  fetch: (req: Request) => server.fetch(req),
};
