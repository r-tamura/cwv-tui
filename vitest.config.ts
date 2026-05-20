import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.{ts,tsx}"],
    globals: false,
    testTimeout: 10_000,
  },
});
