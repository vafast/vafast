import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    rules: {
      // 允许 any 类型（框架需要灵活性）
      "@typescript-eslint/no-explicit-any": "off",
      // 允许未使用的变量以下划线开头
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // 允许空函数
      "@typescript-eslint/no-empty-function": "off",
      // 允许 require
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    ignores: ["dist/**", "node_modules/**", "*.js", "*.cjs", "*.mjs"],
  }
);

