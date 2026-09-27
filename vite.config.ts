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
  };
}

export default defineConfig({
  plugins: [react(), forgeApi()],
  server: { host: "127.0.0.1", port: 5373, strictPort: true },
  preview: { host: "127.0.0.1", port: 5374, strictPort: true },
});
