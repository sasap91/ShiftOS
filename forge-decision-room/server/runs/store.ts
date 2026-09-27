/**
 * In-memory run and governed-record store.
 *
 * DecisionRun results are deterministic (from model.ts); this store gives them
 * durable identity and lets the asynchronous worker (P4) attach SolverRunEvents.
 * Replaceable with a persistent store without touching the tool contracts.
 */
import {
  createScenarioRun,
  type ActionReceipt,
  type ApprovalRequest,
  type DecisionRun,
  type ObservedOutcome,
} from "../../src/model";
import type { HumanOverrideEvent } from "../../src/shared/contracts";

const runs = new Map<string, DecisionRun>();
const sequence = new Map<string, number>();
const cancelled = new Set<string>();
const approvals = new Map<string, ApprovalRequest>();
const receipts = new Map<string, ActionReceipt>();
const outcomes = new Map<string, ObservedOutcome>();
const overrides: HumanOverrideEvent[] = [];

export function newRun(commitmentId: string): DecisionRun {
  const next = (sequence.get(commitmentId) ?? 0) + 1;
  sequence.set(commitmentId, next);
  const run = createScenarioRun(commitmentId, next);
  runs.set(run.id, run);
  return run;
}

export function getRun(runId: string): DecisionRun | undefined {
  return runs.get(runId);
}

export function latestRun(commitmentId: string): DecisionRun | undefined {
  return [...runs.values()].reverse().find((run) => run.commitmentId === commitmentId);
}

export function cancelRun(runId: string): boolean {
  if (!runs.has(runId)) return false;
  cancelled.add(runId);
  return true;
}

export function isCancelled(runId: string): boolean {
  return cancelled.has(runId);
}

export function addApproval(approval: ApprovalRequest): void {
  approvals.set(approval.id, approval);
}

export function getApproval(approvalId: string): ApprovalRequest | undefined {
  return approvals.get(approvalId);
}

export function countApprovals(): number {
  return approvals.size;
}

export function addReceipt(receipt: ActionReceipt): void {
  receipts.set(receipt.id, receipt);
}

export function getReceipt(receiptId: string): ActionReceipt | undefined {
  return receipts.get(receiptId);
}

export function receiptsForApproval(approvalId: string): ActionReceipt[] {
  return [...receipts.values()].filter((receipt) => receipt.approvalId === approvalId);
}

export function latestReceipt(): ActionReceipt | undefined {
  return [...receipts.values()].reverse().find((receipt) => receipt.mode === "execute" && receipt.status === "accepted");
}

export function addOutcome(outcome: ObservedOutcome): void {
  outcomes.set(outcome.id, outcome);
}

export function outcomeForReceipt(receiptId: string): ObservedOutcome | undefined {
  return [...outcomes.values()].find((outcome) => outcome.receiptId === receiptId);
}

export function addOverride(event: HumanOverrideEvent): void {
  overrides.push(event);
}

export function listOverrides(): HumanOverrideEvent[] {
  return [...overrides];
}