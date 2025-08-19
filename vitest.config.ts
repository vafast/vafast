import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    include: ["tests/**/*.{test,spec}.{ts,js}"],
    exclude: ["node_modules", "dist"],
    testTimeout: 10000,
  },
});
