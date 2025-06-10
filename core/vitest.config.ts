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
      "@libs": resolve(__dirname, "libs"),
      "@utils": resolve(__dirname, "utils"),
      "@crypto": resolve(__dirname, "crypto"),
      "@configs": resolve(__dirname, "configs"),
      "@adapters": resolve(__dirname, "adapters"),
    }
  },
  plugins: []
});
