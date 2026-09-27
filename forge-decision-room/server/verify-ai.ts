/**
 * P3 verification: grounding validator (deterministic) + optional live AI turn.
 * The live check only runs when FEATURE_AI_CHAT=1 and a key is configured.
 */
import { assess, envelopeFor } from "../src/model";
import type { Block, Turn } from "../src/shared/contracts";
import { aiEnabled } from "./model/client";
import { mergeProse } from "./orchestrators/explain";
import { generalTurn } from "./orchestrators/general";
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

// --- explain merge: model prose replaces answer/why; governed blocks survive ---
const deterministic = {
  id: "t-merge",
  speaker: "Manufacturing Manager",
  prompt: "Compare options",
  tools: ["compare_alternatives"],
  progress: [],
  blocks: [
    { kind: "answer", text: "deterministic answer" },
    { kind: "why", text: "deterministic why" },
    { kind: "options", runId: "DR-COM-1042-R1" },
    { kind: "next", actions: [{ label: "Request named approval", intent: { type: "request-approval", rationale: "" } }] },
  ] as Block[],
} as Turn;
const prose: Block[] = [
  { kind: "answer", text: "model answer" },
  { kind: "why", text: "model why" },
  { kind: "explanation", text: "model explanation" },
];
const merged = mergeProse(deterministic, prose);
assert.equal(merged.blocks[0].kind === "answer" && merged.blocks[0].text, "model answer");
assert.equal(merged.blocks.some((b) => b.kind === "options"), true);
assert.equal(merged.blocks.some((b) => b.kind === "next"), true);
assert.equal(merged.blocks.filter((b) => b.kind === "answer").length, 1);
console.log("explain merge verified (prose replaced · governed blocks preserved)");

// --- general route: broad answer, no operational tools ---
const generalContext: ToolContext = {
  traceId: "tr-general-verify",
  requestId: "req-general-verify",
  envelope: envelopeFor("manufacturing-manager", "COM-1042", { kind: "baseline" }),
  role: "manufacturing-manager",
  commitmentId: "COM-1042",
  now: "2026-09-26T08:15:00-06:00",
};
const general = await generalTurn(generalContext, "Why is the sky blue?", async () => ({
  value: {
    answer: "Blue light is scattered more strongly by Earth's atmosphere than longer wavelengths.",
    basis: "This is established general scientific knowledge.",
  },
  raw: "",
  model: "test-model",
  finishReason: "stop",
}));
assert.equal(general.turn.tools.length, 0);
assert.equal(general.turn.blocks[0].kind, "answer");
assert.equal(general.model, "test-model");
console.log("general assistant verified (broad answer · zero operational tools)");

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
