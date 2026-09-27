import type { Role } from "../../src/model";
import type { TablePreference } from "../../src/shared/v2";
import { readStore, writeStore } from "./json-store";

type PreferenceStore = Record<string, TablePreference>;
const FILE = "preferences/table.json";

function key(userId: string, role: Role): string {
  return `${userId}:${role}`;
}

export function getTablePreference(userId: string, role: Role): TablePreference | null {
  return readStore<PreferenceStore>(FILE, {})[key(userId, role)] ?? null;
}

export function putTablePreference(preference: TablePreference): TablePreference {
  const store = readStore<PreferenceStore>(FILE, {});
  store[key(preference.userId, preference.role)] = preference;
  writeStore(FILE, store);
  return preference;
}
