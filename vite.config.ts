import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    outDir: "dist/client",
    // Three.js is the bulk of the bundle; fine as one chunk for now.
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        // The public voxel workshop — creature models are data PRs, and this
        // page is how contributors (and our agents) view them.
        "voxel-preview": resolve(__dirname, "voxel-preview.html"),
      },
    },
  },
  server: {
    proxy: {
      // `pnpm dev:api` runs the worker on :8787; the Vite dev server proxies
      // API calls to it so the client can be developed with HMR.
      "/api": "http://localhost:8787",
    },
  },
});
