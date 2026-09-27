/**
 * Typed-tool gateway verification (P2 acceptance).
 * Deterministic values, provenance, authorization, argument validation, timeout.
 */
import { envelopeFor } from "../src/model";
import { invoke } from "./tools/gateway";
import { ToolError } from "./tools/schema";
import { GOVERNED_DATASETS } from "./tools/registry";
import type { ToolContext } from "./tools/types";

const assert = {
  equal(actual: unknown, expected: unknown) {
    if (actual !== expected) throw new Error(`expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
  },
  ok(value: unknown, message: string) {
    if (!value) throw new Error(message);
  },
  async rejects(run: () => Promise<unknown>, code: string) {
    try {
      await run();
    } catch (error) {
      if (error instanceof ToolError && error.code === code) return;
      throw new Error(`expected ToolError ${code}, got ${error instanceof Error ? error.message : String(error)}`);
    }
    throw new Error(`expected rejection ${code}`);
  },
};

function ctx(role: Parameters<typeof envelopeFor>[0], commitmentId: string): ToolContext {
  return {
    traceId: `tr-test-${role}`,
    requestId: `req-${role}`,
    envelope: envelopeFor(role, commitmentId, { kind: "baseline" }),
    role,
    commitmentId,
    now: "2026-09-26T08:15:00-06:00",
  };
}

const manager = ctx("manufacturing-manager", "COM-1042");
const planner = ctx("shift-planner", "COM-1042");
const demand = ctx("demand-planner", "COM-1042");

// --- deterministic read values match the services ---
const packet = await invoke("get_evidence_packet", { commitmentId: "COM-1042" }, manager);
assert.equal(packet.ref, "EVP-COM-1042");
const eligible = (packet.data as { derivedFacts: { name: string; result: string }[] }).derivedFacts.find((f) => f.name === "ELIGIBLE");
assert.equal(eligible?.result, "280");
assert.ok(packet.provenance.length > 0, "packet must carry provenance");

const snapshot = await invoke("get_commitment_snapshot", {}, manager);
assert.equal((snapshot.data as { earliestShipDate: string }).earliestShipDate, "2026-10-19");

const chain = await invoke("explain_risk_chain", {}, manager);
assert.equal((chain.data as { bindingConstraint: string }).bindingConstraint, "Leak-test capacity");

const blast = await invoke("trace_blast_radius", {}, manager);
assert.ok((blast.data as { id: string }[]).some((row) => row.id === "COM-1042"), "blast radius should include COM-1042");

// --- the model-facing workspace bundle can resolve every governed dataset ---
for (const dataset of GOVERNED_DATASETS) {
  const result = await invoke("get_dataset", { dataset }, manager);
  assert.equal(result.ref, dataset);
  assert.ok(result.provenance.length > 0, `${dataset} must carry provenance`);
  assert.ok(result.data !== undefined, `${dataset} must return data`);
}

// --- scenario + comparison ---
const run = await invoke("run_recovery_scenario", {}, manager);
assert.equal(run.ref, "DR-COM-1042-R1");
const compare = await invoke("compare_alternatives", { runId: run.ref }, manager);
assert.equal((compare.data as { alternatives: unknown[] }).alternatives.length, 6);

// --- workflow: approval creation respects role + policy ---
const draft = await invoke("draft_approval_brief", { runId: run.ref, optionId: "OPT-THIRD-SHIFT" }, planner);
assert.ok((draft.data as { draft: string }).draft.includes("not an approval"), "draft must be labelled");

const approval = await invoke(
  "request_named_approval",
  { runId: run.ref, optionId: "OPT-THIRD-SHIFT", rationale: "Protect the 15 October promise with a pegged third shift." },
  planner,
);
const approvalData = approval.data as { id: string; status: string; approvers: { role: string }[] };
assert.equal(approvalData.status, "pending");
assert.equal(approvalData.approvers[0]?.role, "manufacturing-manager");

// --- execution is denied for a non-executing role ---
await assert.rejects(() => invoke("simulate_approved_action", { approvalId: approvalData.id }, planner), "unauthorized");

// --- execute by manager is refused until approval is complete (dry run first) ---
const receipt = await invoke("simulate_approved_action", { approvalId: approvalData.id }, manager);
assert.equal((receipt.data as { status: string }).status, "rejected");

// --- argument validation + unknown tool ---
await assert.rejects(() => invoke("request_named_approval", { optionId: "OPT-THIRD-SHIFT" }, planner), "invalid_args");
await assert.rejects(() => invoke("does_not_exist", {}, manager), "unknown_tool");

// --- override requires an approver role ---
await assert.rejects(
  () => invoke("record_human_override", { approvalId: approvalData.id, code: "LABOR_NOT_REALISTIC", rationale: "no crew" }, demand),
  "unauthorized",
);

console.log("typed-tool gateway verified");
