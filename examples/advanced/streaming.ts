import { Server } from "../../src";
import type { Route } from "../../src";

// 流式响应示例
const routes: Route[] = [
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

            if (count >= 10) {
              controller.close();
              clearInterval(interval);
            }
          }, 1000);
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

            if (chunkCount < 5) {
              setTimeout(sendChunk, 1000);
            } else {
              controller.close();
            }
          };

          sendChunk();
        },
      });

      return new Response(stream, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    },
  },
];

const server = new Server(routes);

export default {
  fetch: (req: Request) => server.fetch(req),
};
