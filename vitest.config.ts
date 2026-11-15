import { defineConfig } from "vitest/config";

export default defineConfig({
  define: { __DEV__: "false", __VERSION__: '"0.1.0-test"' },
  test: { environment: "happy-dom", clearMocks: true, restoreMocks: true },
  plugins: [{
    name: "css-as-text",
    enforce: "pre",
    async transform(_code, id) {
      if (!id.endsWith(".css")) return;
      const { readFile } = await import("node:fs/promises");
      return { code: `export default ${JSON.stringify(await readFile(id, "utf8"))};`, map: null };
    },
  }],
});
