/**
 * Framework-agnostic API handler. Works as a Node http listener and as a Vite
 * Connect middleware (dev), so `npm run dev` runs the client and the AI control
 * plane in one process.
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import type { ChatRequest } from "../src/shared/contracts";
import { audit } from "./audit/log";
import { runTurn } from "./chat";
import { aiEnabled } from "./model/client";
import { handleV2Api } from "./api/v2";

const AI_MODE = aiEnabled() ? "ai" : "scripted";

function send(res: ServerResponse, status: number, body: unknown): void {
  const json = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(json);
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export async function apiHandler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? "/", "http://localhost");

  if (await handleV2Api(req, res, url)) return;

  if (req.method === "GET" && url.pathname === "/api/health") {
    send(res, 200, { ok: true, service: "forge-ai-chat", mode: AI_MODE });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/chat/turn") {
    try {
      const body = (await readJson(req)) as ChatRequest;
      if (!body?.role || !body?.commitmentId) {
        send(res, 400, { error: "role and commitmentId are required" });
        return;
      }
      send(res, 200, await runTurn(body));
    } catch (error) {
      audit({ kind: "error", detail: String(error) });
      send(res, 500, { error: "turn_failed" });
    }
    return;
  }

  send(res, 404, { error: "not_found" });
}

/** Vite Connect middleware: only handles /api, passes everything else through. */
export function createApiMiddleware() {
  return (req: IncomingMessage, res: ServerResponse, next: (err?: unknown) => void): void => {
    const url = req.url ?? "";
    if (!url.startsWith("/api")) {
      next();
      return;
    }
    apiHandler(req, res).catch((error) => {
      audit({ kind: "error", detail: String(error) });
      try {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: "turn_failed" }));
      } catch {
        // response already closed
      }
    });
  };
}
