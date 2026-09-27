/**
 * Typed-tool contracts. Every tool has a name, version, input parser,
 * authorization policy, timeout, idempotency behaviour, and an outcome that
 * carries provenance (fact ids / calc ids / run ids).
 */
import type { ContextEnvelope, Role } from "../../src/shared/contracts";

export type ToolContext = {
  traceId: string;
  requestId: string;
  envelope: ContextEnvelope;
  role: Role;
  commitmentId: string;
  now: string;
};

export type PolicyDecision = { allowed: boolean; reason: string };

export type ToolOutcome = {
  /** Stable reference for citations, e.g. EVP-COM-1042 or DR-COM-1042-R1. */
  ref: string;
  /** Fact / calculation / run ids the outcome draws on. */
  provenance: string[];
  data: unknown;
};

export type Tool<Args = unknown> = {
  name: string;
  version: string;
  description: string;
  async: boolean;
  timeoutMs: number;
  idempotent: boolean;
  parse(raw: unknown): Args;
  authorize(ctx: ToolContext, args: Args): PolicyDecision;
  run(ctx: ToolContext, args: Args): ToolOutcome | Promise<ToolOutcome>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyTool = Tool<any>;

export type ToolCallRecord = {
  tool: string;
  version: string;
  args: unknown;
  status: "ok" | "denied" | "error" | "timeout";
  reason?: string;
  ref?: string;
  durationMs: number;
};