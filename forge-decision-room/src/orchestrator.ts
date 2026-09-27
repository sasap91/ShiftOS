/**
 * Conversation orchestrator.
 * Interprets intent, chooses authorized tools, and explains service output.
 * It does not calculate inventory, capacity, dates, or feasibility.
 */
import {
  type ActionReceipt,
  type Alternative,
  type ApprovalRequest,
  type Commitment,
  type ContextEnvelope,
  type DecisionRun,
  type ObservedOutcome,
  type Phase,
  type Role,
  type ToolName,
  PEOPLE,
  ROLE_POLICY,
  assess,
  blastRadius,
  canonicalResult,
  commitment,
  createApproval,
  createScenarioRun,
  decideApproval,
  envelopeFor,
  formatDay,
  formatMoney,
  gatewayReceipt,
  observeReceipt,
  optionById,
  seeded1104Approval,
  seeded1104Receipt,
} from "./model";
import { MASTER_SET_VERSION } from "./master";

export type Intent =
  | { type: "explain" }
  | { type: "why" }
  | { type: "blast" }
  | { type: "scenario" }
  | { type: "compare" }
  | { type: "draft" }
  | { type: "select-option"; optionId: string }
  | { type: "request-approval"; rationale: string }
  | { type: "record-approval"; approvalId: string; decision: "approved" | "rejected"; rationale: string }
  | { type: "simulate" }
  | { type: "observe"; receiptId: string }
  | { type: "focus-run"; runId: string | null }
  | { type: "ask"; text: string };

export type NextAction = { label: string; intent: Intent };

export type Block =
  | { kind: "answer" | "why" | "explanation" | "recommendation" | "action"; text: string }
  | { kind: "facts"; ids: string[] }
  | { kind: "calculations"; ids: string[] }
  | { kind: "gaps"; texts: string[] }
  | { kind: "blast" }
  | { kind: "options"; runId: string }
  | { kind: "note"; text: string }
  | { kind: "approval-draft"; runId: string; optionId: string }
  | { kind: "approval"; approvalId: string }
  | { kind: "receipt"; receiptId: string }
  | { kind: "outcome"; outcomeId: string }
  | { kind: "next"; actions: NextAction[] };

export type Turn = {
  id: string;
  speaker: string;
  prompt: string | null;
  tools: string[];
  progress: string[];
  blocks: Block[];
};

export type Thread = {
  commitmentId: string;
  phase: Phase;
  runs: DecisionRun[];
  approvals: ApprovalRequest[];
  receipts: ActionReceipt[];
  outcomes: ObservedOutcome[];
  selectedOptionId: string | null;
  focusedRunId: string | null;
  turns: Turn[];
  notice: string | null;
};

export type ActionId = "explain" | "why" | "blast" | "scenario" | "compare" | "draft" | "approve" | "simulate";

const PROGRESS: Record<string, string[]> = {
  explain: ["Checking eligible inventory", "Comparing test capacity"],
  why: ["Opening the causal chain", "Reading source records"],
  blast: ["Tracing pegs from the leak-test fixture", "Listing affected commitments"],
  scenario: ["Freezing the baseline snapshot", "Solving recovery options"],
  compare: ["Loading the decision run", "Separating feasible and rejected options"],
  draft: ["Reading approved facts", "Drafting a note that is not a promise"],
  approve: ["Checking approval policy", "Naming required approvers"],
  simulate: ["Validating approval and idempotency", "Running the writeback gateway"],
  observe: ["Reading the execution receipt", "Comparing expected and observed results"],
  ask: ["Checking the evidence packet"],
};

const PHASES: Phase[] = ["orient", "investigate", "compare", "approve", "act", "observe"];

export function openThread(commitmentId: string): Thread {
  const baseline = assess(commitmentId).baseline;
  let thread: Thread = {
    commitmentId,
    phase: "orient",
    runs: [baseline],
    approvals: [],
    receipts: [],
    outcomes: [],
    selectedOptionId: null,
    focusedRunId: null,
    turns: [],
    notice: null,
  };
  if (commitmentId === "COM-1018") {
    const run = createScenarioRun(commitmentId, 1);
    const approval = createApproval(
      run,
      "OPT-ALT-MV14B",
      PEOPLE["shift-planner"],
      "Allocate on-hand MV-14B so the 15 October manifold promise stays intact.",
      1,
    );
    thread = {
      ...thread,
      phase: "approve",
      runs: [baseline, run],
      approvals: [approval],
      selectedOptionId: "OPT-ALT-MV14B",
    };
  }
  if (commitmentId === "COM-1104") {
    const execute = seeded1104Receipt();
    thread = {
      ...thread,
      phase: "act",
      approvals: [seeded1104Approval()],
      receipts: [
        {
          ...execute,
          id: "RCP-1104-DRY",
          mode: "dry-run",
          reconciliation: "not-applicable",
          attemptedAt: "2026-09-26T07:42:00-06:00",
          detail: "Dry run accepted. The schedule acknowledgment was not written yet.",
        },
        execute,
      ],
    };
  }
  return {
    ...thread,
    turns: [
      {
        id: `${commitmentId}-seed`,
        speaker: "Decision room",
        prompt: null,
        tools: ["get_evidence_packet", "explain_risk"],
        progress: [],
        blocks: orientBlocks(thread),
      },
    ],
  };
}

export function scenarioOf(thread: Thread): ContextEnvelope["scenario"] {
  if (!thread.focusedRunId) return { kind: "baseline" };
  return { kind: "scenario", runId: thread.focusedRunId };
}

export function interpret(text: string): Intent {
  const query = text.trim().toLowerCase();
  if (!query) return { type: "explain" };
  if (/^why\b|causal|evidence chain/.test(query)) return { type: "why" };
  if (/blast|who else|affected|radius/.test(query)) return { type: "blast" };
  if (/scenario|recover/.test(query)) return { type: "scenario" };
  if (/compare|alternative/.test(query)) return { type: "compare" };
  if (/draft|email|communication|note to the customer/.test(query)) return { type: "draft" };
  if (/dry run|simulate|receipt|execute|writeback/.test(query)) return { type: "simulate" };
  if (/outcome|did it work|observe/.test(query)) return { type: "observe", receiptId: "" };
  if (/approv/.test(query)) return { type: "request-approval", rationale: "" };
  if (/risk|feasible|infeasible|explain|status|commitment/.test(query)) return { type: "explain" };
  return { type: "ask", text: text.trim() };
}

export function actionAvailability(
  thread: Thread,
  role: Role,
): Record<ActionId, { enabled: boolean; reason: string; label: string }> {
  const policy = ROLE_POLICY[role];
  const roleLabel = PEOPLE[role].roleLabel;
  const scenario = latestScenario(thread);
  const selected = selectedAlternative(thread);
  const approval = approvalForSelection(thread) ?? thread.approvals.at(-1);
  const dryRun = approval
    ? thread.receipts.find((row) => row.approvalId === approval.id && row.mode === "dry-run" && row.status === "accepted")
    : undefined;
  const executed = approval
    ? thread.receipts.find((row) => row.approvalId === approval.id && row.mode === "execute" && row.status === "accepted")
    : undefined;
  return {
    explain: { enabled: true, reason: `${roleLabel} lens: ${policy.leadQuestion}`, label: "Explain risk" },
    why: { enabled: true, reason: "Open the causal chain.", label: "Why" },
    blast: { enabled: true, reason: "Show commitments touched by the shared fixture.", label: "Blast radius" },
    scenario: { enabled: true, reason: "Create an immutable recovery run. The baseline stays put.", label: "Run scenario" },
    compare: {
      enabled: true,
      reason: scenario ? "Compare solver alternatives." : "No scenario is on file yet. Compare will say so.",
      label: "Compare",
    },
    draft: { enabled: true, reason: "Draft a note. It is not a customer commitment.", label: "Draft" },
    approve: {
      enabled: Boolean(policy.canPropose && selected && selected.feasibility === "feasible"),
      reason: !policy.canPropose
        ? `${roleLabel} does not raise operational approvals.`
        : selected
          ? "Request named approval for the selected option."
          : "Select a feasible option first.",
      label: "Request approval",
    },
    simulate: {
      enabled: Boolean(policy.canExecute && approval && approval.status === "approved"),
      reason: !policy.canExecute
        ? `${roleLabel} may prepare but not execute; a plant approver runs the gateway.`
        : approval
          ? approval.status === "approved"
            ? executed
              ? "Show the accepted receipt. The gateway is idempotent."
              : dryRun
                ? "Simulate the approved writeback."
                : "Dry-run the approved action."
            : "Named approval is still open."
          : "Approval is required before a dry run.",
      label: executed ? "Show receipt" : dryRun ? "Simulate writeback" : "Dry run",
    },
  };
}

export function reduce(thread: Thread, envelope: ContextEnvelope, intent: Intent): { thread: Thread; turn: Turn } {
  const speaker = envelope.user.roleLabel;
  if (intent.type === "focus-run") {
    return {
      thread: { ...thread, focusedRunId: intent.runId },
      turn: turn(thread, speaker, null, [], [], []),
    };
  }
  const prompt = promptFor(intent);
  if (intent.type === "select-option") return selectOption(thread, envelope, intent.optionId, prompt);
  if (intent.type === "request-approval") return requestApproval(thread, envelope, intent.rationale, prompt);
  if (intent.type === "record-approval") return recordApproval(thread, envelope, intent, prompt);
  if (intent.type === "simulate") return simulate(thread, envelope, prompt);
  if (intent.type === "observe") return observe(thread, speaker, intent.receiptId, prompt);
  if (intent.type === "scenario") return runScenario(thread, speaker, prompt);
  if (intent.type === "compare") return compare(thread, speaker, prompt);
  if (intent.type === "draft") return drafted(thread, speaker, prompt);
  if (intent.type === "why") return answered(thread, speaker, prompt, "why", whyBlocks(thread));
  if (intent.type === "blast") return answered(thread, speaker, prompt, "blast", blastBlocks(thread));
  if (intent.type === "ask") return answered(thread, speaker, prompt, "ask", askBlocks(thread, intent.text));
  return answered(thread, speaker, prompt, "explain", explainBlocks(thread));
}

function answered(
  thread: Thread,
  speaker: string,
  prompt: string | null,
  progressKey: string,
  blocks: Block[],
): { thread: Thread; turn: Turn } {
  const phase: Phase =
    progressKey === "why" || progressKey === "blast" || progressKey === "explain" || progressKey === "ask"
      ? "investigate"
      : thread.phase;
  const tools = toolsFor(progressKey);
  return {
    thread: advance(thread, phase),
    turn: turn(thread, speaker, prompt, tools, PROGRESS[progressKey] ?? PROGRESS.ask, blocks),
  };
}

function runScenario(thread: Thread, speaker: string, prompt: string | null) {
  const baseline = thread.runs[0];
  const sequence = thread.runs.filter((row) => row.kind === "scenario").length + 1;
  const created = createScenarioRun(thread.commitmentId, sequence);
  const previous = latestScenario(thread);
  const same =
    previous && canonicalResult(previous) === canonicalResult(created)
      ? " The feasibility matches the earlier run on this snapshot."
      : "";
  const nextThread = advance(
    {
      ...thread,
      runs: [...thread.runs, created],
      notice: `${created.id} is on file. Baseline ${baseline.id} was not modified.${same}`,
    },
    "compare",
  );
  const blocks = compareBlocks(nextThread, created);
  return {
    thread: nextThread,
    turn: turn(nextThread, speaker, prompt, ["create_decision_run"], PROGRESS.scenario, blocks),
  };
}

function compare(thread: Thread, speaker: string, prompt: string | null) {
  const scenario = latestScenario(thread);
  if (!scenario) {
    return answered(thread, speaker, prompt, "compare", [
      ...explainBlocks(thread).filter((block) => block.kind !== "next"),
      { kind: "note", text: "There is no scenario run yet, so there are no alternatives to compare." },
      { kind: "next", actions: [{ label: "Run recovery scenario", intent: { type: "scenario" } }] },
    ]);
  }
  const nextThread = advance(thread, "compare");
  return {
    thread: nextThread,
    turn: turn(nextThread, speaker, prompt, ["compare_alternatives"], PROGRESS.compare, compareBlocks(nextThread, scenario)),
  };
}

function selectOption(thread: Thread, envelope: ContextEnvelope, optionId: string, prompt: string | null) {
  if (!envelope.policy.canSelectOptions) {
    return answered(thread, envelope.user.roleLabel, prompt, "compare", [
      { kind: "answer", text: "Demand planning does not select an operational option." },
      {
        kind: "why",
        text: "A reprioritisation is a request to Program, not a plant selection. The options stay visible for the plant approvers.",
      },
      { kind: "next", actions: nextFor(thread) },
    ]);
  }
  const scenario = [...thread.runs].reverse().find((row) => row.alternatives.some((option) => option.id === optionId));
  if (!scenario) {
    return answered(thread, envelope.user.roleLabel, prompt, "compare", explainBlocks(thread));
  }
  const option = optionById(scenario, optionId);
  if (option.feasibility === "infeasible") {
    const gate = option.violatedHardConstraints.map((row) => row.label).join("; ");
    return answered(thread, envelope.user.roleLabel, prompt, "compare", [
      { kind: "answer", text: `${option.label} stays unselected.` },
      {
        kind: "why",
        text: option.whyRejected ?? "The solver marked this option infeasible.",
      },
      {
        kind: "explanation",
        text: gate
          ? `Violated hard constraint: ${gate}.`
          : "No hard gate was violated. The option still fails the objective, so it cannot be submitted.",
      },
      { kind: "next", actions: nextFor(thread) },
    ]);
  }
  const nextThread = { ...advance(thread, "compare"), selectedOptionId: option.id };
  return {
    thread: nextThread,
    turn: turn(
      nextThread,
      envelope.user.roleLabel,
      prompt,
      ["compare_alternatives"],
      ["Reading the selected alternative"],
      [
        { kind: "answer", text: `${option.label} is selected for approval.` },
        { kind: "why", text: "Selection is a human step. The solver does not select it." },
        { kind: "explanation", text: optionSummary(option) },
        {
          kind: "next",
          actions: [{ label: "Request named approval", intent: { type: "request-approval", rationale: "" } }],
        },
      ],
    ),
  };
}

function requestApproval(thread: Thread, envelope: ContextEnvelope, rationale: string, prompt: string | null) {
  const scenario = latestScenario(thread);
  const option = selectedAlternative(thread);
  if (!scenario || !option) {
    return answered(thread, envelope.user.roleLabel, prompt, "approve", [
      { kind: "answer", text: "Approval cannot be requested yet." },
      { kind: "why", text: "A feasible option has to be selected from a scenario run." },
      { kind: "note", text: "The baseline has not been changed." },
      { kind: "next", actions: nextFor(thread) },
    ]);
  }
  if (option.feasibility === "infeasible") {
    return selectOption(thread, envelope, option.id, prompt);
  }
  const existing = thread.approvals.find((row) => row.optionId === option.id && row.runId === scenario.id);
  if (existing) {
    return answered(thread, envelope.user.roleLabel, prompt, "approve", [
      { kind: "answer", text: "This option already has an approval request." },
      { kind: "why", text: "A second request would fork the decision record." },
      { kind: "approval", approvalId: existing.id },
      { kind: "next", actions: nextFor(thread) },
    ]);
  }
  if (rationale.trim().length < 12) {
    return answered(thread, envelope.user.roleLabel, prompt, "approve", [
      { kind: "answer", text: "Name the request before it becomes a record." },
      { kind: "why", text: "Policy needs a rationale, the required approvers, and an expiry." },
      { kind: "approval-draft", runId: scenario.id, optionId: option.id },
      { kind: "next", actions: [] },
    ]);
  }
  const approval = createApproval(scenario, option.id, envelope.user, rationale, thread.approvals.length + 1, {
    snapshotId: envelope.snapshotId,
    masterSetVersion: MASTER_SET_VERSION,
    seed: 0,
  });
  const nextThread = advance({ ...thread, approvals: [...thread.approvals, approval] }, "approve");
  return {
    thread: nextThread,
    turn: turn(nextThread, envelope.user.roleLabel, prompt, ["create_approval_request"], PROGRESS.approve, [
      { kind: "answer", text: "The approval request is on file." },
      { kind: "why", text: "Named approvers have to decide before any writeback." },
      { kind: "explanation", text: "The supply planner submitted the request and cannot approve it." },
      { kind: "approval", approvalId: approval.id },
      { kind: "next", actions: nextFor(nextThread) },
    ]),
  };
}

function recordApproval(
  thread: Thread,
  envelope: ContextEnvelope,
  intent: Extract<Intent, { type: "record-approval" }>,
  prompt: string | null,
) {
  const current = thread.approvals.find((row) => row.id === intent.approvalId);
  if (!current) {
    return answered(thread, envelope.user.roleLabel, prompt, "approve", explainBlocks(thread));
  }
  if (!envelope.policy.canApprove) {
    return answered(thread, envelope.user.roleLabel, prompt, "approve", [
      { kind: "answer", text: `${envelope.user.roleLabel} does not record approval decisions.` },
      {
        kind: "why",
        text: "Named approvers record decisions; the shift planner and demand planner raise requests and hand them on.",
      },
      { kind: "approval", approvalId: current.id },
      { kind: "next", actions: nextFor(thread) },
    ]);
  }
  try {
    const updated = decideApproval(current, envelope.user, intent.decision, intent.rationale);
    const approvals = thread.approvals.map((row) => (row.id === updated.id ? updated : row));
    const nextThread = advance({ ...thread, approvals }, "approve");
    return {
      thread: nextThread,
      turn: turn(nextThread, envelope.user.roleLabel, prompt, ["record_approval_decision"], PROGRESS.approve, [
        {
          kind: "answer",
          text:
            updated.status === "approved"
              ? "Every required approver has approved this option."
              : updated.status === "rejected"
                ? "The request is rejected."
                : `${envelope.user.name} recorded a ${intent.decision} decision.`,
        },
        { kind: "why", text: "The decision is stored on the approval record, not as chat text." },
        { kind: "action", text: `${envelope.user.roleLabel} · ${intent.decision}` },
        { kind: "approval", approvalId: updated.id },
        { kind: "next", actions: nextFor(nextThread) },
      ]),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "The decision was refused.";
    return answered(thread, envelope.user.roleLabel, prompt, "approve", [
      { kind: "answer", text: "The decision was not recorded." },
      { kind: "why", text: message },
      { kind: "approval", approvalId: current.id },
      { kind: "next", actions: nextFor(thread) },
    ]);
  }
}

function simulate(thread: Thread, envelope: ContextEnvelope, prompt: string | null) {
  const speaker = envelope.user.roleLabel;
  if (!envelope.policy.canExecute) {
    return answered(thread, speaker, prompt, "simulate", [
      { kind: "answer", text: `${speaker} does not execute a writeback.` },
      {
        kind: "why",
        text: "A plant approver runs the gateway. This role prepares the case and hands it on.",
      },
      { kind: "next", actions: nextFor(thread) },
    ]);
  }
  const approval = [...thread.approvals].reverse().find((row) => row.optionId === thread.selectedOptionId) ?? thread.approvals.at(-1);
  if (!approval) {
    return answered(thread, speaker, prompt, "simulate", [
      { kind: "answer", text: "There is nothing to simulate." },
      { kind: "why", text: "The gateway only runs against a named approval request." },
      { kind: "next", actions: nextFor(thread) },
    ]);
  }
  const already = thread.receipts.find(
    (row) => row.approvalId === approval.id && row.mode === "execute" && row.status === "accepted",
  );
  if (already) {
    const nextThread = advance(thread, "act");
    return {
      thread: nextThread,
      turn: turn(nextThread, speaker, prompt, ["simulate_writeback"], PROGRESS.simulate, [
        { kind: "answer", text: "The earlier receipt still stands." },
        { kind: "why", text: "The same idempotency key returns the accepted simulated writeback." },
        { kind: "receipt", receiptId: already.id },
        { kind: "next", actions: nextFor(nextThread) },
      ]),
    };
  }
  const mode = thread.receipts.some((row) => row.approvalId === approval.id && row.mode === "dry-run" && row.status === "accepted")
    ? "execute"
    : "dry-run";
  const receipt = gatewayReceipt(approval, mode, thread.receipts, {
    snapshotId: envelope.snapshotId,
    masterSetVersion: MASTER_SET_VERSION,
    seed: 0,
  });
  const receipts = thread.receipts.some((row) => row.id === receipt.id) ? thread.receipts : [...thread.receipts, receipt];
  const nextThread = advance({ ...thread, receipts }, "act");
  return {
    thread: nextThread,
    turn: turn(nextThread, speaker, prompt, mode === "dry-run" ? ["dry_run_action"] : ["simulate_writeback"], PROGRESS.simulate, [
      {
        kind: "answer",
        text:
          receipt.status === "rejected"
            ? "The gateway rejected the attempt."
            : mode === "dry-run"
              ? "The dry run was accepted."
              : "The simulated writeback was accepted.",
      },
      { kind: "why", text: receipt.detail },
      { kind: "action", text: mode === "dry-run" ? "Dry run" : "Simulated execution" },
      { kind: "receipt", receiptId: receipt.id },
      { kind: "next", actions: nextFor(nextThread) },
    ]),
  };
}

function observe(thread: Thread, speaker: string, receiptId: string, prompt: string | null) {
  const receipt =
    thread.receipts.find((row) => row.id === receiptId) ??
    [...thread.receipts].reverse().find((row) => row.mode === "execute" && row.status === "accepted");
  if (!receipt) {
    return answered(thread, speaker, prompt, "observe", [
      { kind: "answer", text: "There is no execution receipt to observe." },
      { kind: "why", text: "An outcome is recorded against an accepted writeback, not against a recommendation." },
      { kind: "next", actions: nextFor(thread) },
    ]);
  }
  const existing = thread.outcomes.find((row) => row.receiptId === receipt.id);
  if (existing) {
    const nextThread = advance(thread, "observe");
    return {
      thread: nextThread,
      turn: turn(nextThread, speaker, prompt, ["record_outcome"], PROGRESS.observe, [
        { kind: "answer", text: "The observed outcome is already on this thread." },
        { kind: "why", text: existing.reason },
        { kind: "outcome", outcomeId: existing.id },
        { kind: "next", actions: [] },
      ]),
    };
  }
  const row = commitment(thread.commitmentId);
  const outcome = observeReceipt(
    receipt,
    thread.commitmentId,
    `Ship ${row.qty} ${row.uom} on ${formatDay(row.promiseDate, true)}.`,
  );
  const nextThread = advance({ ...thread, outcomes: [...thread.outcomes, outcome] }, "observe");
  return {
    thread: nextThread,
    turn: turn(nextThread, speaker, prompt, ["record_outcome"], PROGRESS.observe, [
      { kind: "answer", text: "The commitment is not successful." },
      { kind: "why", text: outcome.reason },
      { kind: "outcome", outcomeId: outcome.id },
      { kind: "next", actions: [] },
    ]),
  };
}

function drafted(thread: Thread, speaker: string, prompt: string | null) {
  const row = commitment(thread.commitmentId);
  const view = assess(thread.commitmentId);
  const scenario = latestScenario(thread);
  const lines = [
    "Draft for internal review. This is not an approved customer commitment and must not be sent as a promise.",
    `${row.id} for ${row.customer}, ${row.qty} ${row.product}, promised ${formatDay(row.promiseDate, true)}, is ${view.baseline.feasibility} on ${view.packet.snapshotId}.`,
    view.baseline.bindingConstraint
      ? `Binding constraint: ${view.baseline.bindingConstraint}.`
      : "No binding constraint is open on the baseline.",
    scenario
      ? `${scenario.id} is on file and does not change ${thread.runs[0].id}.`
      : "No recovery run is on file.",
  ];
  return answered(thread, speaker, prompt, "draft", [
    { kind: "answer", text: "A draft is ready for review." },
    { kind: "why", text: "Sales operations cannot publish an unapproved promise." },
    { kind: "explanation", text: lines.join(" ") },
    { kind: "gaps", texts: view.packet.missing },
    { kind: "next", actions: nextFor(thread) },
  ]);
}

function explainBlocks(thread: Thread): Block[] {
  const row = commitment(thread.commitmentId);
  const view = assess(thread.commitmentId);
  const scenario = latestScenario(thread);
  return [
    { kind: "answer", text: answerLine(row, view.baseline.feasibility) },
    { kind: "why", text: whyLine(view.baseline.bindingConstraint) },
    { kind: "explanation", text: explanationFor(thread) },
    { kind: "facts", ids: view.packet.sourceFacts.slice(0, 4).map((fact) => fact.id) },
    { kind: "calculations", ids: summaryCalculations(thread.commitmentId) },
    { kind: "gaps", texts: gapTexts(thread) },
    scenario
      ? { kind: "options", runId: scenario.id }
      : { kind: "note", text: "No scenario run is on file. Options appear only after a recovery run." },
    {
      kind: "recommendation",
      text: scenario
        ? recommendation(scenario)
        : "No option is recommended yet. Run a recovery scenario before treating any alternative as available.",
    },
    { kind: "next", actions: nextFor(thread) },
  ];
}

function whyBlocks(thread: Thread): Block[] {
  const view = assess(thread.commitmentId);
  const chain = causalIds(thread.commitmentId);
  return [
    { kind: "answer", text: whyLine(view.baseline.bindingConstraint) },
    { kind: "why", text: "The chain below is the causal record. It is not a second essay." },
    { kind: "facts", ids: chain.facts },
    { kind: "calculations", ids: chain.calculations },
    { kind: "gaps", texts: gapTexts(thread) },
    { kind: "note", text: "Rejected and feasible alternatives stay on the scenario run. Why does not create one." },
    { kind: "next", actions: nextFor(thread) },
  ];
}

function blastBlocks(thread: Thread): Block[] {
  const affected = blastRadius().filter((row) => row.causedByLeakTest && row.shortfall > 0);
  return [
    {
      kind: "answer",
      text:
        affected.length > 0
          ? `The leak-test downtime shorts ${affected.map((row) => row.id).join(", ")}.`
          : "The leak-test downtime does not short a commitment in this window.",
    },
    { kind: "why", text: "Pegging walks priority order through the shared fixture. Other shortages stay on their own events." },
    { kind: "blast" },
    { kind: "next", actions: nextFor(thread) },
  ];
}

function compareBlocks(thread: Thread, scenario: DecisionRun): Block[] {
  const feasible = scenario.alternatives.filter((row) => row.feasibility === "feasible");
  const rejected = scenario.alternatives.filter((row) => row.feasibility === "infeasible");
  return [
    { kind: "answer", text: answerLine(commitment(thread.commitmentId), scenario.feasibility) },
    { kind: "why", text: whyLine(scenario.bindingConstraint) },
    {
      kind: "explanation",
      text: `${scenario.id} lists ${feasible.length} feasible and ${rejected.length} infeasible options. Baseline ${thread.runs[0].id} is unchanged.`,
    },
    scenario.alternatives.length
      ? { kind: "options", runId: scenario.id }
      : { kind: "note", text: "The solver returned no recovery options because the baseline already meets the promise." },
    { kind: "recommendation", text: recommendation(scenario) },
    { kind: "next", actions: nextFor(thread) },
  ];
}

function askBlocks(thread: Thread, text: string): Block[] {
  const query = text.toLowerCase();
  const packet = assess(thread.commitmentId).packet;
  if (/waiver|contract|customer accept|split/.test(query)) {
    return [
      { kind: "answer", text: "Customer acceptance of a changed promise cannot be established." },
      { kind: "why", text: packet.missing[0] ?? "The snapshot has no contract clause." },
      { kind: "gaps", texts: gapTexts(thread) },
      { kind: "next", actions: nextFor(thread) },
    ];
  }
  return [
    { kind: "answer", text: "The general AI assistant is temporarily unavailable." },
    {
      kind: "why",
      text: "The decision-room services are still available, but broad questions need the configured language model.",
    },
    { kind: "next", actions: nextFor(thread) },
  ];
}

function orientBlocks(thread: Thread): Block[] {
  const blocks = explainBlocks(thread).filter((block) => block.kind !== "recommendation");
  const approval = thread.approvals.at(-1);
  const receipt = [...thread.receipts].reverse().find((row) => row.mode === "execute");
  const extra: Block[] = [];
  if (approval) extra.push({ kind: "approval", approvalId: approval.id });
  if (receipt) extra.push({ kind: "receipt", receiptId: receipt.id });
  const next = blocks.pop();
  return [...blocks, ...extra, ...(next ? [next] : [])];
}

function explanationFor(thread: Thread): string {
  const row = commitment(thread.commitmentId);
  const view = assess(thread.commitmentId);
  if (row.id === "COM-1042") {
    const allocated = result(view, "ALLOCATED");
    const shortfall = result(view, "SHORTFALL");
    const eligible = result(view, "ELIGIBLE");
    const material = result(view, "MATERIAL");
    const ship = formatDay(view.earliestShipDate, true);
    return `Eligible leak tests allocated to this commitment: ${allocated} of ${row.leakTests}. Shortfall: ${shortfall}. Eligible QD-220 is ${eligible} against 240 required, so the material shortfall is ${material} and does not bind. The earliest full ship on the baseline is ${ship}. ${view.packet.conflicts[0]?.statement ?? ""}`;
  }
  if (row.id === "COM-1018") {
    return `Eligible MV-14 on hand covers 12 of 80 manifolds. The supplier commit is 20 October, so the unbound promise slips to ${formatDay(view.earliestShipDate, true)}. Functional test is not the constraint. An approved alternate is already on hand and waiting for named approval.`;
  }
  if (row.id === "COM-1104") {
    return "Priority allocation covers all 48 leak tests. Operations has already approved the reservation, and the simulated acknowledgment has a receipt. The 10 October ship has not been observed.";
  }
  return "This commitment has no peg in the 15 October leak-test window. The November supplier ASN is still fresh. Nothing on this snapshot makes the promise infeasible.";
}

function recommendation(run: DecisionRun): string {
  if (!run.alternatives.length) return "No recovery is recommended because the baseline meets the promise.";
  const keeper = run.alternatives.find((row) => row.feasibility === "feasible" && row.meetsPromise);
  const split = run.alternatives.find((row) => row.changesPromise && row.feasibility === "feasible");
  if (!keeper) return "No feasible option keeps the original promise. Review the rejected gates before choosing a date change.";
  const cost = keeper.costCad ? ` The overtime estimate is ${formatMoney(keeper.costCad)} and is not a booked actual.` : "";
  const alternate = split ? ` ${split.label} remains visible as a promise change, with its evidence gaps.` : "";
  return `${keeper.label} is the option that keeps the promise.${cost}${alternate} This is a recommendation, not an approval.`;
}

function optionSummary(option: Alternative): string {
  const cost = option.costCad !== null ? ` Estimate ${formatMoney(option.costCad)}.` : "";
  const gaps = option.evidenceGaps.length ? ` Gap: ${option.evidenceGaps.join(" ")}` : "";
  return `${option.onTimeQty} on time. Ship ${formatDay(option.shipDate, true)}.${cost}${gaps}`;
}

function gapTexts(thread: Thread): string[] {
  const packet = assess(thread.commitmentId).packet;
  const stale = packet.freshness.staleRecords.map(
    (record) => `${record} is stale, so anything that depends on it cannot be established.`,
  );
  return [...packet.missing, ...stale, ...packet.conflicts.map((row) => row.statement)];
}

function causalIds(commitmentId: string): { facts: string[]; calculations: string[] } {
  if (commitmentId === "COM-1042") {
    return {
      facts: ["SRC-1042-DEMAND", "SRC-1042-DOWNTIME", "SRC-1042-HOLD", "SRC-1042-PO", "SRC-1042-WAIVER"],
      calculations: ["CALC-COM-1042-CAPACITY", "CALC-COM-1042-ALLOCATED", "CALC-COM-1042-SHORTFALL", "CALC-COM-1042-ELIGIBLE", "CALC-COM-1042-MATERIAL"],
    };
  }
  if (commitmentId === "COM-1018") {
    return {
      facts: ["SRC-1018-SUP", "SRC-1018-ALT", "SRC-1018-FT"],
      calculations: ["CALC-COM-1018-MATERIAL", "CALC-COM-1018-ALT", "CALC-COM-1018-FUNCTIONAL"],
    };
  }
  const packet = assess(commitmentId).packet;
  return {
    facts: packet.sourceFacts.map((fact) => fact.id),
    calculations: packet.derivedFacts.map((fact) => fact.id),
  };
}

function nextFor(thread: Thread): NextAction[] {
  const scenario = latestScenario(thread);
  const selected = selectedAlternative(thread);
  const approval = approvalForSelection(thread) ?? thread.approvals.at(-1);
  const dry = approval
    ? thread.receipts.find((row) => row.approvalId === approval.id && row.mode === "dry-run" && row.status === "accepted")
    : undefined;
  const executed = approval
    ? thread.receipts.find((row) => row.approvalId === approval.id && row.mode === "execute" && row.status === "accepted")
    : undefined;
  if (!scenario && thread.runs[0].feasibility === "infeasible") {
    return [
      { label: "Why", intent: { type: "why" } },
      { label: "Blast radius", intent: { type: "blast" } },
      { label: "Run recovery scenario", intent: { type: "scenario" } },
    ];
  }
  if (scenario && !selected) {
    return [{ label: "Compare alternatives", intent: { type: "compare" } }];
  }
  if (selected && !approval) {
    return [{ label: "Request named approval", intent: { type: "request-approval", rationale: "" } }];
  }
  if (approval && approval.status === "pending") {
    return [{ label: "Review the approval card", intent: { type: "request-approval", rationale: "" } }];
  }
  if (approval && approval.status === "approved" && !dry) {
    return [{ label: "Dry run", intent: { type: "simulate" } }];
  }
  if (approval && approval.status === "approved" && dry && !executed) {
    return [{ label: "Simulate writeback", intent: { type: "simulate" } }];
  }
  if (executed && !thread.outcomes.some((row) => row.receiptId === executed.id)) {
    return [{ label: "Record observed outcome", intent: { type: "observe", receiptId: executed.id } }];
  }
  return [
    { label: "Explain risk", intent: { type: "explain" } },
    { label: "Blast radius", intent: { type: "blast" } },
  ];
}

function answerLine(row: Commitment, feasibility: DecisionRun["feasibility"]): string {
  const day = formatDay(row.promiseDate);
  return feasibility === "infeasible"
    ? `The ${day} commitment is currently infeasible.`
    : `The ${day} commitment is currently feasible.`;
}

function whyLine(binding: string | null): string {
  if (!binding) return "No modeled constraint is binding.";
  if (binding === "Leak-test capacity") return "Leak-test capacity is the binding constraint.";
  return `${binding} is the binding constraint.`;
}

function summaryCalculations(commitmentId: string): string[] {
  if (commitmentId === "COM-1042") {
    return ["CALC-COM-1042-SHORTFALL", "CALC-COM-1042-ALLOCATED", "CALC-COM-1042-ELIGIBLE", "CALC-COM-1042-SHIP"];
  }
  return assess(commitmentId).packet.derivedFacts.map((fact) => fact.id);
}

function result(view: ReturnType<typeof assess>, name: string): string {
  const found = view.packet.derivedFacts.find((fact) => fact.name === name);
  if (!found) throw new Error(`Missing calculation ${name}`);
  return found.result;
}

function latestScenario(thread: Thread): DecisionRun | undefined {
  return [...thread.runs].reverse().find((row) => row.kind === "scenario");
}

function selectedAlternative(thread: Thread): Alternative | undefined {
  if (!thread.selectedOptionId) return undefined;
  for (const run of [...thread.runs].reverse()) {
    const option = run.alternatives.find((row) => row.id === thread.selectedOptionId);
    if (option) return option;
  }
  return undefined;
}

function approvalForSelection(thread: Thread): ApprovalRequest | undefined {
  if (!thread.selectedOptionId) return undefined;
  return [...thread.approvals].reverse().find((row) => row.optionId === thread.selectedOptionId);
}

function advance(thread: Thread, phase: Phase): Thread {
  if (PHASES.indexOf(phase) <= PHASES.indexOf(thread.phase)) return thread;
  return { ...thread, phase };
}

function toolsFor(progressKey: string): ToolName[] {
  if (progressKey === "why") return ["get_causal_chain"];
  if (progressKey === "blast") return ["get_blast_radius"];
  if (progressKey === "compare") return ["compare_alternatives"];
  if (progressKey === "draft") return ["draft_communication"];
  if (progressKey === "approve") return ["create_approval_request"];
  return ["get_evidence_packet", "explain_risk"];
}

function promptFor(intent: Intent): string | null {
  switch (intent.type) {
    case "explain":
      return "Explain why this commitment is at risk";
    case "why":
      return "Why?";
    case "blast":
      return "Show the blast radius";
    case "scenario":
      return "Run recovery scenario";
    case "compare":
      return "Compare feasible alternatives";
    case "draft":
      return "Draft communication";
    case "simulate":
      return "Simulate the approved action";
    case "observe":
      return "Record the observed outcome";
    case "request-approval":
      return "Request named approval";
    case "select-option":
      return "Select option";
    case "record-approval":
      return "Record approver decision";
    case "ask":
      return intent.text;
    default:
      return null;
  }
}

function turn(
  thread: Thread,
  speaker: string,
  prompt: string | null,
  tools: ToolName[],
  progress: string[],
  blocks: Block[],
): Turn {
  return {
    id: `${thread.commitmentId}-t${thread.turns.length + 1}`,
    speaker,
    prompt,
    tools,
    progress,
    blocks,
  };
}

export function activeEnvelope(role: Role, thread: Thread): ContextEnvelope {
  return envelopeFor(role, thread.commitmentId, scenarioOf(thread));
}
