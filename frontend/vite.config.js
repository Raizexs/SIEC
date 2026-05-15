import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
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
