/**
 * OpenAI-compatible model client (sciforium by default).
 *
 * The key lives only on the server. The client is provider-agnostic via env:
 *   LLM_BASE_URL  (default https://api.sciforium.com/v1)
 *   LLM_API_KEY   (falls back to SCIFORIUM_API_KEY)
 *   LLM_MAX_TOKENS
 * AI turns are only used when FEATURE_AI_CHAT=1.
 */
export type ChatRole = "system" | "user" | "assistant";
export type ChatMessage = { role: ChatRole; content: string };

export class ModelError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "ModelError";
    this.code = code;
  }
}

const BASE = (process.env.LLM_BASE_URL ?? "https://api.sciforium.com/v1").replace(/\/$/, "");
export const DEEPSEEK_V41_FLASH_MODEL = "/deployments/506a9a37/deepseek-ai/DeepSeek-V4.1-Flash";
const MODEL = DEEPSEEK_V41_FLASH_MODEL;
const KEY = process.env.LLM_API_KEY ?? process.env.SCIFORIUM_API_KEY ?? "";
const DEFAULT_MAX = Number(process.env.LLM_MAX_TOKENS ?? 3000);
const TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS ?? 90000);

export function modelConfigured(): boolean {
  return KEY.length > 0;
}

export function aiEnabled(): boolean {
  return process.env.FEATURE_AI_CHAT !== "0" && modelConfigured();
}

export function modelName(): string {
  return MODEL;
}

export type ChatResult = {
  content: string;
  model: string;
  finishReason: string;
};

export async function chat(
  messages: ChatMessage[],
  options: { maxTokens?: number; json?: boolean } = {},
): Promise<ChatResult> {
  if (!modelConfigured()) throw new ModelError("not_configured", "No model key is configured.");

  const body: Record<string, unknown> = {
    model: MODEL,
    messages,
    max_tokens: options.maxTokens ?? DEFAULT_MAX,
  };
  if (options.json) body.response_format = { type: "json_object" };

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(`${BASE}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${KEY}` },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        if (response.status >= 500 && attempt === 0) {
          lastError = new ModelError("upstream_error", `model ${response.status}`);
          continue;
        }
        throw new ModelError("upstream_error", `model ${response.status}: ${detail.slice(0, 200)}`);
      }
      const payload = (await response.json()) as {
        choices?: { message?: { content?: string }; finish_reason?: string }[];
      };
      const choice = payload.choices?.[0];
      const content = choice?.message?.content ?? "";
      if (!content) throw new ModelError("empty_response", "The model returned no content.");
      return { content, model: MODEL, finishReason: choice?.finish_reason ?? "stop" };
    } catch (error) {
      clearTimeout(timer);
      if (error instanceof ModelError && error.code === "upstream_error" && attempt === 0) continue;
      lastError = error;
      if (attempt === 0) continue;
    }
  }
  if (lastError instanceof ModelError) throw lastError;
  throw new ModelError("request_failed", lastError instanceof Error ? lastError.message : String(lastError));
}

/** Call the model and parse a single JSON object from the response. */
export async function chatJson<T>(
  messages: ChatMessage[],
  options: { maxTokens?: number } = {},
): Promise<{ value: T; raw: string; model: string; finishReason: string }> {
  const result = await chat(messages, { ...options, json: true });
  const text = result.content.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new ModelError("invalid_json", "The model did not return JSON.");
  try {
    const value = JSON.parse(text.slice(start, end + 1)) as T;
    return { value, raw: result.content, model: result.model, finishReason: result.finishReason };
  } catch {
    throw new ModelError("invalid_json", "The model returned malformed JSON.");
  }
}
