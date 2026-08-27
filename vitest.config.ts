import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [],
  test: {
    environment: "node",
    include: ["src/**/*.spec.ts"],
    coverage: {
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
    },
  },
});
