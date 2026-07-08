import { defineConfig } from "vite";
import { resolve } from "node:path";

// Set by compose.yaml: listen on all interfaces, poll for file changes
// (macOS bind mounts don't propagate fs events reliably), and reach the
// worker running on the host through host.docker.internal.
const inDocker = !!process.env.VITE_DOCKER;

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
        // Procedural SDF creature workshop — see design/PROCEDURAL-CREATURES.md.
        "proto-preview": resolve(__dirname, "proto-preview.html"),
      },
    },
  },
  server: {
    host: inDocker ? true : undefined,
    port: inDocker ? 5273 : undefined,
    strictPort: inDocker,
    // VirtioFS on recent Docker Desktop propagates fs events into the
    // container, so native watching works. If hot reload ever stops firing,
    // set VITE_POLL=1 in compose.yaml to fall back to polling.
    watch: process.env.VITE_POLL
      ? { usePolling: true, interval: 300 }
      : undefined,
    proxy: {
      // `pnpm dev:api` runs the worker on :8787; the Vite dev server proxies
      // API calls to it so the client can be developed with HMR. `ws: true`
      // lets the /api/presence websocket upgrade tunnel through too.
      "/api": inDocker
        ? { target: "http://host.docker.internal:8787", ws: true }
        : { target: "http://localhost:8787", ws: true },
    },
  },
});
