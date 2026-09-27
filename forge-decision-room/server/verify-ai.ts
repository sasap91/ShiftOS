/**
 * P3 verification: grounding validator (deterministic) + optional live AI turn.
 * The live check only runs when FEATURE_AI_CHAT=1 and a key is configured.
 */
import { assess, envelopeFor } from "../src/model";
import { aiEnabled } from "./model/client";
import { investigateTurn } from "./orchestrators/investigate";
import { insufficiencyPlan, validateInvestigation, type InvestigationPlan } from "./validate/respond";
import type { ToolContext } from "./tools/types";

const assert = {
  equal(actual: unknown, expected: unknown) {
    if (actual !== expected) throw new Error(`expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
  },
  ok(value: unknown, message: string) {
    if (!value) throw new Error(message);
  },
};

const packet = assess("COM-1042").packet;

const good: InvestigationPlan = {
  answer: "The 15 October commitment is infeasible.",
  why: "Leak-test capacity is the binding constraint.",
  explanation: "Eligible tests allocated are short 64 for this commitment.",
  factIds: ["SRC-1042-DOWNTIME"],
  calculationIds: ["CALC-COM-1042-SHORTFALL"],
  gaps: [],
};
const goodResult = validateInvestigation(good, packet);
assert.equal(goodResult.ok, true);

const fabricated: InvestigationPlan = { ...good, answer: "The 15 October commitment is short 999 tests." };
const fabricatedResult = validateInvestigation(fabricated, packet);
assert.equal(fabricatedResult.ok, false);
assert.ok(
  fabricatedResult.violations.some((violation) => violation.includes("999")),
  "fabricated number must be flagged",
);

const badId: InvestigationPlan = { ...good, factIds: ["SRC-DOES-NOT-EXIST"] };
assert.equal(validateInvestigation(badId, packet).ok, false);

const overApproved: InvestigationPlan = { ...good, explanation: "The commitment is approved on 64 tests." };
assert.ok(
  validateInvestigation(overApproved, packet).violations.some((violation) => violation.includes("approved")),
  "must not read approved over a conflict",
);

const fallback = insufficiencyPlan(["number 999 is not grounded"]);
assert.ok(fallback.answer.includes("cannot be established"), "fallback must be an insufficiency answer");
assert.equal(fallback.gaps.length, 1);

console.log("grounding validator verified");

if (aiEnabled()) {
  const role = "manufacturing-manager" as const;
  const ctx: ToolContext = {
    traceId: "tr-ai-verify",
    requestId: "req-ai-verify",
    envelope: envelopeFor(role, "COM-1042", { kind: "baseline" }),
    role,
    commitmentId: "COM-1042",
    now: "2026-09-26T08:15:00-06:00",
  };
  const result = await investigateTurn(ctx, "Why is the 15 October promise at risk?");
  assert.ok(result.turn.blocks.some((block) => block.kind === "answer"), "live turn must include an answer block");
  assert.equal(result.validation.ok, true);
  console.log(`live AI turn verified · model ${result.model} · prompt ${result.promptVersion}`);
} else {
  console.log("live AI turn skipped (FEATURE_AI_CHAT not enabled or no key)");
}