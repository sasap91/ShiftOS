/**
 * Router + chat control-plane verification (P1 acceptance).
 * Deterministic routing, authorized tool subsets, general questions, role policy.
 */
import { classify } from "./router/router";
import { runTurn } from "./chat";

const assert = {
  equal(actual: unknown, expected: unknown) {
    if (actual !== expected) {
      throw new Error(`expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
    }
  },
  deepEqual(actual: unknown, expected: unknown) {
    const left = JSON.stringify(actual);
    const right = JSON.stringify(expected);
    if (left !== right) throw new Error(`expected ${right} but got ${left}`);
  },
  match(value: string, pattern: RegExp) {
    if (!pattern.test(value)) throw new Error(`${value} did not match ${pattern}`);
  },
};

// --- intent classification: investigation vs scenario vs approval/action ---
const why = classify({ role: "manufacturing-manager", text: "Why is this at risk?" });
assert.equal(why.intentClass, "investigation");
assert.deepEqual(why.tools, ["explain_risk_chain", "get_evidence_packet", "get_dataset"]);
assert.equal(why.subOrchestrator, "investigate");

const scenario = classify({ role: "manufacturing-manager", text: "Run recovery scenario" });
assert.equal(scenario.intentClass, "scenario");
assert.deepEqual(scenario.tools, ["run_recovery_scenario"]);
assert.equal(scenario.subOrchestrator, "scenario");

const decide = classify({ role: "manufacturing-manager", action: "approve" });
assert.equal(decide.intentClass, "approval");
assert.deepEqual(decide.tools, ["request_named_approval", "record_human_override"]);

const exec = classify({ role: "manufacturing-manager", action: "simulate" });
assert.equal(exec.intentClass, "action");
assert.equal(exec.policy.allowed, true);

const blast = classify({ role: "shift-planner", action: "blast" });
assert.equal(blast.intentClass, "trace");
assert.deepEqual(blast.tools, ["trace_blast_radius"]);

// --- role policy gating ---
const plannerExec = classify({ role: "shift-planner", action: "simulate" });
assert.equal(plannerExec.policy.allowed, false);
assert.match(plannerExec.policy.reason, /prepare but not execute/);

const demandExec = classify({ role: "demand-planner", action: "simulate" });
assert.equal(demandExec.policy.allowed, false);

const plannerApprove = classify({ role: "shift-planner", action: "approve" });
assert.equal(plannerApprove.policy.allowed, true);

// --- broad questions use the tool-free general route ---
const ambiguous = classify({ role: "manufacturing-manager", text: "what is the weather tomorrow" });
assert.equal(ambiguous.intentClass, "general");
assert.equal(ambiguous.fallback, null);
assert.equal(ambiguous.subOrchestrator, "none");
assert.deepEqual(ambiguous.tools, []);
assert.equal(ambiguous.policy.allowed, true);

// --- empty composer submit orients the thread ---
const orient = classify({ role: "manufacturing-manager" });
assert.equal(orient.intentClass, "lookup");
assert.equal(orient.fallback, null);

// --- end-to-end scripted turn ---
const turn = await runTurn({ role: "manufacturing-manager", commitmentId: "COM-1042", text: "why is this infeasible" });
assert.equal(turn.mode, "scripted");
assert.equal(turn.route.intentClass, "investigation");
if (!turn.turn.blocks.some((block) => block.kind === "why")) {
  throw new Error("investigation turn did not include a why block");
}

const refused = await runTurn({ role: "demand-planner", commitmentId: "COM-1042", action: "simulate" });
const refusedAnswer = refused.turn.blocks.find((block) => block.kind === "answer");
assert.equal(refusedAnswer?.kind === "answer" && refusedAnswer.text, "That action is not available for this role.");

const unknown = await runTurn({ role: "manufacturing-manager", commitmentId: "COM-1042", text: "what is the weather tomorrow" });
const clarify = unknown.turn.blocks.find((block) => block.kind === "answer");
assert.match(clarify?.kind === "answer" ? clarify.text : "", /general AI assistant is temporarily unavailable/i);

console.log("router + chat control plane verified");
