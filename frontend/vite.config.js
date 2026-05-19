import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const excelBrowser = path.resolve(
  __dirname,
  "node_modules/exceljs/dist/exceljs.min.js",
);

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      // Build de navegador; evita pre-bundle roto del entry Node en dev.
      exceljs: excelBrowser,
    },
  },
  optimizeDeps: {
    // "exceljs" ya apunta al bundle browser vía alias; no usar subpath aquí.
    include: ["exceljs", "jspdf", "html2canvas"],
  },
  test: {
    globals: true,
    environment: "node",
    exclude: [
      "**/node_modules/**",
      "**/cypress/**",
      "**/composables/__tests__/test_metalcon_validator.test.cjs",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
});
