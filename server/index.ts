/**
 * Standalone API server (production / `npm run api`).
 * In dev, the same handler is mounted inside Vite via `createApiMiddleware`.
 */
import { createServer } from "node:http";
import { apiHandler } from "./app";

const PORT = Number(process.env.PORT ?? 8788);

const server = createServer((req, res) => {
  apiHandler(req, res).catch(() => {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: "internal_error" }));
  });
});

server.listen(PORT, () => {
  console.log(`FORGE AI control plane listening on http://localhost:${PORT}`);
});
