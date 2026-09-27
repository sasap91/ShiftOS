import type { ActiveContext, V2ChatResponse } from "../../shared/v2";

const USER_ID = "local-user";

export async function assistantHealth(): Promise<"connected" | "limited"> {
  const response = await fetch("/api/health");
  if (!response.ok) return "limited";
  const payload = (await response.json()) as { mode?: string };
  return payload.mode === "ai" ? "connected" : "limited";
}

export async function sendChatMessage(text: string, context: ActiveContext, signal?: AbortSignal): Promise<V2ChatResponse> {
  const response = await fetch("/api/v2/chat/messages", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId: USER_ID, text, context }),
    signal,
  });
  if (!response.ok) throw new Error("assistant_unavailable");
  return response.json() as Promise<V2ChatResponse>;
}

export async function clearChatHistory(): Promise<void> {
  await fetch(`/api/v2/chat/thread?userId=${USER_ID}`, { method: "DELETE" });
}
