import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.{ts,tsx}"],
    globals: false,
    testTimeout: 10_000,
    // Ink calls getWindowSize() many times per render+unmount. When stdout isn't
    // a TTY (it isn't in tests), getWindowSize falls back to terminal-size,
    // which on macOS shells out to `tput cols` and `tput lines` via
    // execFileSync — ~150 ms each, ~1 s per render/unmount cycle. Setting
    // COLUMNS/LINES short-circuits terminal-size to its env-var branch.
    env: {
      COLUMNS: "100",
      LINES: "30",
    },
  },
});
