import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const noop = fileURLToPath(new URL("./test/empty-module.ts", import.meta.url));

export default defineConfig({
  test: {
    // See test/empty-module.ts — neutralize the server-only guard for unit tests.
    alias: { "server-only": noop, "client-only": noop },
  },
});
