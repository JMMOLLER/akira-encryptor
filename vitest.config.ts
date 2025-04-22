import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  test: {
    globals: true,
    environment: "node"
  },
  resolve: {
    alias: {
      "@libs": resolve(__dirname, "core/libs"),
      "@utils": resolve(__dirname, "core/utils"),
      "@configs": resolve(__dirname, "core/configs")
    }
  },
  plugins: [tsconfigPaths()]
});
