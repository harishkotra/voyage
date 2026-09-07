import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api/chat": {
        target: "https://chatjimmy.ai",
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
