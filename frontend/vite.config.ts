import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      "/health": {
        target: "http://localhost:5000",
        changeOrigin: true
      },
      "/ingest": {
        target: "http://localhost:5000",
        changeOrigin: true
      },
      "/items": {
        target: "http://localhost:5000",
        changeOrigin: true,
        bypass(req) {
          if (req.headers.accept?.includes("text/html")) {
            return "/index.html";
          }
        }
      },
      "/query": {
        target: "http://localhost:5000",
        changeOrigin: true,
        bypass(req) {
          if (req.headers.accept?.includes("text/html")) {
            return "/index.html";
          }
        }
      },
      "/api-docs": {
        target: "http://localhost:5000",
        changeOrigin: true
      }
    }
  }
});
