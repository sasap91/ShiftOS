/**
 * Authorized typed-tool gateway. The single entry point the orchestrators (and
 * therefore the model) use to reach deterministic services:
 *
 *   authorize -> validate args -> execute (with timeout) -> audit -> return
 *
 * The model never calls a service directly; every call is policy-checked,
 * argument-validated, bounded, and recorded.
 */
import { audit } from "../audit/log";
import { toolByName } from "./registry";
import { ToolError } from "./schema";
import type { PolicyDecision, ToolContext, ToolOutcome } from "./types";

export type GatewayResult = {
  tool: string;
  version: string;
  ref: string;
  provenance: string[];
  data: unknown;
  durationMs: number;
  policy: PolicyDecision;
};

function withTimeout<T>(value: T | Promise<T>, ms: number, name: string): Promise<T> {
  if (!(value instanceof Promise)) return Promise.resolve(value);
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new ToolError("timeout", `${name} timed out after ${ms}ms`)), ms);
    value.then(
      (result) => {
        clearTimeout(timer);
        resolve(result);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export async function invoke(name: string, rawArgs: unknown, ctx: ToolContext): Promise<GatewayResult> {
  const started = Date.now();
  const tool = toolByName(name);
  if (!tool) {
    audit({ kind: "tool", traceId: ctx.traceId, tool: name, status: "error", reason: "unknown_tool" });
    throw new ToolError("unknown_tool", `Unknown tool ${name}.`);
  }

  let args: unknown;
  try {
    args = tool.parse(rawArgs);
  } catch (error) {
    const message = error instanceof ToolError ? error.message : "invalid arguments";
    audit({ kind: "tool", traceId: ctx.traceId, tool: name, status: "error", reason: `invalid_args: ${message}` });
    throw new ToolError("invalid_args", message);
  }

  const policy = tool.authorize(ctx, args);
  if (!policy.allowed) {
    audit({ kind: "tool", traceId: ctx.traceId, tool: name, status: "denied", reason: policy.reason });
    throw new ToolError("unauthorized", policy.reason);
  }

  try {
    const outcome = await withTimeout(tool.run(ctx, args) as ToolOutcome | Promise<ToolOutcome>, tool.timeoutMs, name);
    const durationMs = Date.now() - started;
    audit({
      kind: "tool",
      traceId: ctx.traceId,
      tool: name,
      version: tool.version,
      args,
      status: "ok",
      ref: outcome.ref,
      durationMs,
    });
    return {
      tool: name,
      version: tool.version,
      ref: outcome.ref,
      provenance: outcome.provenance,
      data: outcome.data,
      durationMs,
      policy,
    };
  } catch (error) {
    const durationMs = Date.now() - started;
    const code = error instanceof ToolError ? error.code : "tool_error";
    const message = error instanceof Error ? error.message : String(error);
    audit({ kind: "tool", traceId: ctx.traceId, tool: name, status: error instanceof ToolError && error.code === "timeout" ? "timeout" : "error", reason: message, durationMs });
    throw error instanceof ToolError ? error : new ToolError(code, message);
  }
}