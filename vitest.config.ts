import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/*/tests/**/*.test.ts", "scripts/**/*.test.mjs"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["packages/validation/src/**/*.ts", "packages/example/src/**/*.ts"],
      exclude: ["**/*.test.ts", "**/generated/**", "packages/example/src/index.ts"],
      thresholds: { branches: 90, functions: 90, lines: 90, statements: 90 }
    }
  }
});
