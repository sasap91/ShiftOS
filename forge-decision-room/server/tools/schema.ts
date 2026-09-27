/**
 * Minimal runtime argument validation for tools. No dependencies: every tool
 * declares a `parse` that turns untrusted input into typed args or throws a
 * ToolError. This is the "validate all tool arguments" requirement.
 */
export class ToolError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "ToolError";
    this.code = code;
  }
}

function asRecord(raw: unknown, path: string): Record<string, unknown> {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new ToolError("invalid_args", `${path} must be an object`);
  }
  return raw as Record<string, unknown>;
}

export function expectObject(raw: unknown): Record<string, unknown> {
  return asRecord(raw ?? {}, "args");
}

export function expectString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new ToolError("invalid_args", `${key} must be a non-empty string`);
  }
  return value;
}

export function optionalString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") throw new ToolError("invalid_args", `${key} must be a string`);
  return value;
}

export function expectEnum<T extends string>(
  record: Record<string, unknown>,
  key: string,
  values: readonly T[],
): T {
  const value = record[key];
  if (typeof value !== "string" || !values.includes(value as T)) {
    throw new ToolError("invalid_args", `${key} must be one of ${values.join(", ")}`);
  }
  return value as T;
}

export function expectStringArray(record: Record<string, unknown>, key: string): string[] {
  const value = record[key];
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new ToolError("invalid_args", `${key} must be an array of strings`);
  }
  return value as string[];
}