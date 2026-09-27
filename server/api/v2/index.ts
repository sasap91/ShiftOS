import type { IncomingMessage, ServerResponse } from "node:http";
import { assess, PEOPLE, type Role } from "../../../src/model";
import { buildLedger, buildLedgerRow } from "../../../src/ledger";
import { openThread } from "../../../src/orchestrator";
import type { Citation, TablePreference, V2ChatRequest, V2ChatResponse } from "../../../src/shared/v2";
import { connectorStatus } from "../../connectors";
import { answerGeneralQuestion } from "../../chat/general";
import { runTurn } from "../../chat";
import { appendChatMessage, clearChatThread, getChatThread } from "../../repositories/chat-threads";
import { getDemandProjection } from "../../repositories/demand";
import { getTablePreference, putTablePreference } from "../../repositories/preferences";

const ORDER_IDS = ["COM-1042", "COM-1018", "COM-1104", "COM-0991"];
const ROLES = Object.keys(PEOPLE) as Role[];

function send(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
}

function seededThreads() {
  return Object.fromEntries(ORDER_IDS.map((id) => [id, openThread(id)]));
}

function plainText(turn: Awaited<ReturnType<typeof runTurn>>["turn"]): string {
  const paragraphs = turn.blocks.flatMap((block) => {
    if ("text" in block) return [block.text];
    if (block.kind === "gaps") return block.texts;
    if (block.kind === "options") return ["Recovery alternatives are ready for comparison in this conversation."];
    if (block.kind === "approval-draft") return ["An approval request can be prepared after a feasible option is selected."];
    if (block.kind === "approval") return [`Approval record ${block.approvalId} is available.`];
    if (block.kind === "receipt") return [`Execution receipt ${block.receiptId} is available.`];
    if (block.kind === "outcome") return [`Observed outcome ${block.outcomeId} is available.`];
    return [];
  });
  return paragraphs.join("\n\n") || "The request completed, but no explanatory text was returned.";
}

function citationsFor(orderId: string, turn: Awaited<ReturnType<typeof runTurn>>["turn"]): Citation[] {
  const packets = [orderId, ...ORDER_IDS.filter((id) => id !== orderId)].map((id) => assess(id).packet);
  const ids = new Set(turn.blocks.flatMap((block) => (block.kind === "facts" ? block.ids : [])));
  return packets.flatMap((packet) => packet.sourceFacts)
    .filter((fact) => ids.has(fact.id))
    .map((fact) => ({
      id: fact.id,
      label: `${fact.sourceSystem} · ${fact.sourceRecordId}`,
      source: "FORGE" as const,
      detail: fact.statement,
    }));
}

async function createMessage(body: V2ChatRequest): Promise<V2ChatResponse> {
  const history = getChatThread(body.userId).messages.slice(-16).map((message) => ({
    actor: message.actor,
    content: message.content,
    contextSnapshot: message.contextSnapshot,
  }));
  appendChatMessage(body.userId, "user", body.text, body.context, { citations: [] });
  const orderId = body.context.orderId;

  if (!orderId || !ORDER_IDS.includes(orderId)) {
    const answer = await answerGeneralQuestion(body.text, body.context);
    const message = appendChatMessage(body.userId, "assistant", answer.content, body.context, { citations: [] });
    return { message, mode: answer.mode, limitations: answer.limitations };
  }

  const result = await runTurn({
    role: body.context.role,
    commitmentId: orderId,
    text: body.text,
    ...(body.action ? { action: body.action } : {}),
  }, history);
  const citations = citationsFor(orderId, result.turn);
  const message = appendChatMessage(body.userId, "assistant", plainText(result.turn), body.context, { citations });
  return { message, mode: result.mode, turn: result.turn, limitations: [] };
}

function roleFrom(value: string | null): Role | null {
  return value && ROLES.includes(value as Role) ? (value as Role) : null;
}

export async function handleV2Api(req: IncomingMessage, res: ServerResponse, url: URL): Promise<boolean> {
  if (!url.pathname.startsWith("/api/v2/")) return false;

  if (req.method === "GET" && url.pathname === "/api/v2/orders") {
    send(res, 200, { orders: buildLedger(seededThreads()) });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/v2/demand") {
    send(res, 200, { demand: getDemandProjection() });
    return true;
  }

  const orderMatch = url.pathname.match(/^\/api\/v2\/orders\/(COM-\d+)\/details$/);
  if (req.method === "GET" && orderMatch) {
    const orderId = orderMatch[1];
    if (!ORDER_IDS.includes(orderId)) send(res, 404, { error: "order_not_found" });
    else send(res, 200, { order: buildLedgerRow(openThread(orderId)), packet: assess(orderId).packet });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/v2/connectors") {
    send(res, 200, { connectors: connectorStatus() });
    return true;
  }

  if (url.pathname === "/api/v2/chat/thread") {
    const userId = url.searchParams.get("userId") ?? "local-user";
    if (req.method === "GET") send(res, 200, getChatThread(userId));
    else if (req.method === "DELETE") send(res, 200, clearChatThread(userId));
    else send(res, 405, { error: "method_not_allowed" });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/v2/chat/messages") {
    const body = (await readJson(req)) as V2ChatRequest;
    if (!body.userId || !body.text?.trim() || !body.context || !roleFrom(body.context.role)) {
      send(res, 400, { error: "userId, text and a valid context are required" });
    } else {
      send(res, 200, await createMessage(body));
    }
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/v2/chat/events") {
    const userId = url.searchParams.get("userId") ?? "local-user";
    res.statusCode = 200;
    res.setHeader("content-type", "text/event-stream; charset=utf-8");
    res.setHeader("cache-control", "no-cache");
    res.end(`event: snapshot\ndata: ${JSON.stringify(getChatThread(userId))}\n\n`);
    return true;
  }

  if (req.method === "POST" && /^\/api\/v2\/chat\/confirmations\//.test(url.pathname)) {
    send(res, 409, {
      error: "no_pending_confirmation",
      detail: "A governed action can execute only from a live, server-issued confirmation envelope.",
    });
    return true;
  }

  const preferenceMatch = url.pathname.match(/^\/api\/v2\/preferences\/table\/([^/]+)$/);
  if (preferenceMatch) {
    const role = roleFrom(preferenceMatch[1]);
    const userId = url.searchParams.get("userId") ?? "local-user";
    if (!role) send(res, 400, { error: "invalid_role" });
    else if (req.method === "GET") send(res, 200, { preference: getTablePreference(userId, role) });
    else if (req.method === "PUT") {
      const body = (await readJson(req)) as TablePreference;
      if (body.userId !== userId || body.role !== role) send(res, 400, { error: "preference_identity_mismatch" });
      else send(res, 200, { preference: putTablePreference(body) });
    } else send(res, 405, { error: "method_not_allowed" });
    return true;
  }

  send(res, 404, { error: "v2_not_found" });
  return true;
}
