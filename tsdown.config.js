import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  outDir: "dist",
  target: "esnext",
  splitting: false,
  sourcemap: false,
  minify: false,
  treeshake: true,
});
