/**
 * Persona acceptance expectation predicates (T-12).
 * Pure functions over (route, turn) so the runner carries no policy logic.
 */
import type { RouteDecision } from "../../src/shared/contracts";
import type { Turn } from "../../src/orchestrator";
import type { Expect } from "./cases";

export type Outcome = { ok: boolean; detail: string };

export function evaluate(expect: Expect, route: RouteDecision, turn: Turn | null): Outcome {
  switch (expect.kind) {
    case "route": {
      if (route.intentClass !== expect.intentClass) {
        return { ok: false, detail: `intentClass ${route.intentClass} != ${expect.intentClass}` };
      }
      if (expect.subOrchestrator && route.subOrchestrator !== expect.subOrchestrator) {
        return { ok: false, detail: `subOrchestrator ${route.subOrchestrator} != ${expect.subOrchestrator}` };
      }
      if (expect.fallback !== undefined && route.fallback !== expect.fallback) {
        return { ok: false, detail: `fallback ${route.fallback} != ${expect.fallback}` };
      }
      return { ok: true, detail: `route ${route.intentClass}` };
    }
    case "policy": {
      if (route.policy.allowed !== expect.allowed) {
        return { ok: false, detail: `allowed ${route.policy.allowed} != ${expect.allowed}` };
      }
      if (!expect.allowed && !route.policy.reason) {
        return { ok: false, detail: "a refusal must carry a reason" };
      }
      return { ok: true, detail: `policy allowed=${route.policy.allowed}` };
    }
    case "block": {
      if (!turn) return { ok: false, detail: "no turn produced" };
      const has = turn.blocks.some((block) => block.kind === expect.block);
      return has === expect.present
        ? { ok: true, detail: `block ${expect.block} present=${has}` }
        : { ok: false, detail: `block ${expect.block} present=${has}, expected ${expect.present}` };
    }
    case "answer": {
      if (!turn) return { ok: false, detail: "no turn produced" };
      const answer = turn.blocks.find((block) => block.kind === "answer");
      const text = answer && answer.kind === "answer" ? answer.text : "";
      return expect.pattern.test(text)
        ? { ok: true, detail: `answer matched ${expect.pattern}` }
        : { ok: false, detail: `answer ${JSON.stringify(text.slice(0, 80))} did not match ${expect.pattern}` };
    }
    case "redaction":
      return { ok: false, detail: "redaction is evaluated by the runner (needs the role + a fixture memory)" };
    case "blocked":
      return { ok: false, detail: expect.gap };
  }
}