import react from "@vitejs/plugin-react-swc";
import path from "path";
import { defineConfig } from "vite";
import { compression } from "vite-plugin-compression2";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Gzip compression for production builds
    compression({ algorithm: "gzip", threshold: 1024 }),
    // Brotli compression for production builds (better ratio)
    compression({ algorithm: "brotliCompress", threshold: 1024 }),
  ],

  build: {
    // Enable minification for JS and CSS (improves FCP & LCP)
    minify: "esbuild",
    cssMinify: true,
    // Target modern browsers for smaller output
    target: "es2020",
    // Report compressed sizes
    reportCompressedSize: true,
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }

          // Core React - loaded on every page
          if (
            id.includes("react") ||
            id.includes("react-dom") ||
            id.includes("react-router")
          ) {
            return "react-vendor";
          }

          // Heavy 3D/Maps - only loaded when needed (lazy routes)
          if (
            id.includes("@react-three") ||
            id.includes("three") ||
            id.includes("mapbox-gl") ||
            id.includes("leaflet") ||
            id.includes("react-map-gl") ||
            id.includes("@turf")
          ) {
            return "maps-3d-vendor";
          }

          // Socket.io - loaded on demand
          if (id.includes("socket.io")) {
            return "socket-vendor";
          }

          // Charts - only loaded on dashboard
          if (id.includes("recharts") || id.includes("d3-")) {
            return "charts-vendor";
          }

          // Form libraries
          if (
            id.includes("react-hook-form") ||
            id.includes("@hookform") ||
            id.includes("zod") ||
            id.includes("react-dropzone")
          ) {
            return "forms-vendor";
          }

          // UI components
          if (
            id.includes("@radix-ui") ||
            id.includes("framer-motion") ||
            id.includes("motion") ||
            id.includes("lucide-react")
          ) {
            return "ui-vendor";
          }

          // State management & data fetching
          if (
            id.includes("zustand") ||
            id.includes("jotai") ||
            id.includes("@tanstack")
          ) {
            return "state-query-vendor";
          }

          return "vendor";
        },
      },
    },
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@components": path.resolve(__dirname, "./src/components"),
      "@pages": path.resolve(__dirname, "./src/pages"),
      "@services": path.resolve(__dirname, "./src/services"),
      "@hooks": path.resolve(__dirname, "./src/hooks"),
      "@utils": path.resolve(__dirname, "./src/utils"),
      "@types": path.resolve(__dirname, "./src/types"),
      "@store": path.resolve(__dirname, "./src/store"),
    },
  },

  server: {
    port: 5173,
    host: true,
    // Enable HMR through Docker
    watch: {
      usePolling: true,
    },
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
