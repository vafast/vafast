const { defineConfig } = require("tsdown/config");

module.exports = defineConfig({
  clean: true,
  entry: ["src/index.ts"],
  sourcemap: true,
  minify: true,
  // 使用cjs格式，兼容性更好
  format: ["cjs"],
  outDir: "dist",
  dts: true,
});

