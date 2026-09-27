/**
 * Server-created ContextEnvelope. The client supplies only a role, commitment
 * and optional run; the server resolves scope, policy, snapshot and disclosure.
 * The model may reference this envelope but cannot expand it.
 */
import { envelopeFor, type Role } from "../../src/model";
import type { ContextEnvelope } from "../../src/shared/contracts";

export function buildEnvelope(role: Role, commitmentId: string, runId?: string): ContextEnvelope {
  return envelopeFor(role, commitmentId, runId ? { kind: "scenario", runId } : { kind: "baseline" });
}