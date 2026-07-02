import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "dist/client",
    // Three.js is the bulk of the bundle; fine as one chunk for now.
    chunkSizeWarningLimit: 1200,
  },
  server: {
    proxy: {
      // `pnpm dev:api` runs the worker on :8787; the Vite dev server proxies
      // API calls to it so the client can be developed with HMR.
      "/api": "http://localhost:8787",
    },
  },
});
