import { defineConfig } from "vitest/config";

export default defineConfig({
  define: { __DEV__: "false", __VERSION__: '"0.4.0-test"' },
  test: {
    environment: "happy-dom",
    clearMocks: true,
    restoreMocks: true,
    css: { include: [/\.css\?raw(?:&|$)/] },
  },
});
