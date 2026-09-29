import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5174,
    allowedHosts: "all",
    proxy: {
      "/api": {
        // Backend runs on :8080 (uvicorn main:app --host 0.0.0.0 --port 8080)
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Heavy libs split into separate chunks — browser caches them across
          // deploys so only the app chunk needs re-downloading on each release.
          react:    ["react", "react-dom", "react-router-dom"],
          motion:   ["framer-motion"],
          icons:    ["lucide-react"],
          crypto:   ["crypto-js"],
          axios:    ["axios"],
          zustand:  ["zustand"],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/tests/setup.js",
    css: false,
  },
});
