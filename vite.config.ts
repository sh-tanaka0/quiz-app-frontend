import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // この設定があるか確認
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
