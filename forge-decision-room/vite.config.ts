import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { createApiMiddleware } from "./server/app";

/** Mounts the AI control plane inside the Vite dev server (single process). */
function forgeApi(): Plugin {
  return {
    name: "forge-api",
    configureServer(server) {
      server.middlewares.use(createApiMiddleware());
    },
    configurePreviewServer(server) {
      server.middlewares.use(createApiMiddleware());
    },
  };
}

export default defineConfig({
  plugins: [react(), forgeApi()],
  server: { host: true, port: 5173, strictPort: false },
  preview: { host: true, port: 5273, strictPort: true },
});
