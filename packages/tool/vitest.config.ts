import { defineConfig } from "vitest/config";

// Unit tests for the toolbar's logic, in a simulated DOM (jsdom).
export default defineConfig({
  define: {
    __VERSION__: JSON.stringify("test"),
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts"],
  },
});
