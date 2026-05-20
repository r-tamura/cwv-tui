import { defineConfig } from "tsup";

export default defineConfig({
  entry: { cli: "src/cli.tsx" },
  format: ["esm"],
  target: "node22",
  platform: "node",
  banner: { js: "#!/usr/bin/env node" },
  clean: true,
  sourcemap: false,
  dts: false,
  minify: false,
  splitting: false,
  external: [
    "react",
    "ink",
    "ink-spinner",
    "ink-text-input",
    "@aws-sdk/client-cloudwatch-logs",
  ],
});
