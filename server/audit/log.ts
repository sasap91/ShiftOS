/**
 * Append-only audit log. Every turn, route decision, tool call, run event and
 * validation result is recorded as JSONL. Audit writes must never break a turn.
 */
import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const DIR = process.env.FORGE_AUDIT_DIR ?? "var/v2/audit";

export function audit(event: Record<string, unknown>): void {
  try {
    mkdirSync(DIR, { recursive: true });
    const day = new Date().toISOString().slice(0, 10);
    const line = JSON.stringify({ at: new Date().toISOString(), ...event });
    appendFileSync(join(DIR, `${day}.jsonl`), `${line}\n`, "utf8");
  } catch (error) {
    console.error("audit_write_failed", error);
  }
}
