import { useEffect, useMemo, useState } from "react";
import type { Role } from "../../model";
import type { TablePreference } from "../../shared/v2";

export const USER_ID = "local-user";
export const DEFAULT_COLUMNS = ["promised", "commitmentId", "product", "qty", "constraint", "risk"];
export const TABLE_PRESET_VERSION = 5;

export const ROLE_DEFAULT_COLUMNS: Record<Role, string[]> = {
  "manufacturing-manager": [
    "promised", "commitmentId", "product", "qty", "onTimeQty", "gapQty", "constraint", "capable", "lifecycle", "risk",
  ],
  "shift-planner": [
    "promised", "commitmentId", "product", "qty", "workCenter", "requiredLoad", "allocatedLoad", "loadGap", "risk",
  ],
  "maintenance-manager": [
    "promised", "commitmentId", "product", "asset", "assetStatus", "impactQty", "recovery", "risk",
  ],
  "demand-planner": [...DEFAULT_COLUMNS],
};

export const ALL_COLUMNS = [
  "promised",
  "commitmentId",
  "product",
  "qty",
  "constraint",
  "risk",
  "customer",
  "program",
  "capable",
  "onTimeQty",
  "lifecycle",
  "provenance",
  "gapQty",
  "workCenter",
  "requiredLoad",
  "allocatedLoad",
  "loadGap",
  "asset",
  "assetStatus",
  "impactQty",
  "recovery",
];

export function defaultTablePreference(role: Role): TablePreference {
  const roleColumns = ROLE_DEFAULT_COLUMNS[role];
  return {
    presetVersion: TABLE_PRESET_VERSION,
    userId: USER_ID,
    role,
    visibleColumns: [...roleColumns],
    columnOrder: [...roleColumns, ...ALL_COLUMNS.filter((key) => !roleColumns.includes(key))],
    widths: {
      promised: 72,
      commitmentId: 100,
      product: 94,
      qty: 70,
      constraint: 125,
      risk: 82,
      customer: 160,
      program: 140,
      capable: 88,
      onTimeQty: 82,
      lifecycle: 88,
      provenance: 150,
      gapQty: 74,
      workCenter: 125,
      requiredLoad: 95,
      allocatedLoad: 100,
      loadGap: 75,
      asset: 120,
      assetStatus: 116,
      impactQty: 82,
      recovery: 150,
    },
    pinnedColumns: ["commitmentId"],
    sort: role === "maintenance-manager"
      ? [{ key: "impactQty", direction: "desc" }]
      : role === "shift-planner"
        ? [{ key: "loadGap", direction: "desc" }]
        : [{ key: "promised", direction: "asc" }],
  };
}

function normalizePreference(role: Role, candidate: Partial<TablePreference>): TablePreference {
  const fallback = defaultTablePreference(role);
  const allowed = new Set(ALL_COLUMNS);
  const candidateOrder = Array.isArray(candidate.columnOrder)
    ? candidate.columnOrder.filter((key) => allowed.has(key))
    : [];
  const columnOrder = [...candidateOrder, ...ALL_COLUMNS.filter((key) => !candidateOrder.includes(key))];
  const requiresRolePresetUpgrade = candidate.presetVersion !== TABLE_PRESET_VERSION;
  const candidateVisible = Array.isArray(candidate.visibleColumns)
    ? candidate.visibleColumns.filter((key) => allowed.has(key))
    : [];

  return {
    ...fallback,
    ...candidate,
    presetVersion: TABLE_PRESET_VERSION,
    userId: USER_ID,
    role,
    visibleColumns: requiresRolePresetUpgrade || !candidateVisible.length ? [...fallback.visibleColumns] : candidateVisible,
    columnOrder: requiresRolePresetUpgrade || !candidateOrder.length ? fallback.columnOrder : columnOrder,
    widths: requiresRolePresetUpgrade ? fallback.widths : { ...fallback.widths, ...(candidate.widths ?? {}) },
    pinnedColumns: !requiresRolePresetUpgrade && Array.isArray(candidate.pinnedColumns)
      ? candidate.pinnedColumns.filter((key) => allowed.has(key))
      : fallback.pinnedColumns,
    sort: !requiresRolePresetUpgrade && Array.isArray(candidate.sort) && candidate.sort.length ? candidate.sort : fallback.sort,
  };
}

function cacheKey(role: Role): string {
  return `forge-v2:table:${USER_ID}:${role}`;
}

function fromCache(role: Role): TablePreference {
  try {
    const raw = window.localStorage.getItem(cacheKey(role));
    if (!raw) return defaultTablePreference(role);
    return normalizePreference(role, JSON.parse(raw) as Partial<TablePreference>);
  } catch {
    return defaultTablePreference(role);
  }
}

export function useTablePreferences(role: Role) {
  const [preference, setPreference] = useState<TablePreference>(() => fromCache(role));
  const endpoint = useMemo(
    () => `/api/v2/preferences/table/${role}?userId=${encodeURIComponent(USER_ID)}`,
    [role],
  );

  useEffect(() => {
    let active = true;
    const cached = fromCache(role);
    setPreference(cached);
    fetch(endpoint)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("preference_unavailable"))))
      .then((payload: { preference: TablePreference | null }) => {
        if (active && payload.preference) setPreference(normalizePreference(role, payload.preference));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [endpoint, role]);

  useEffect(() => {
    window.localStorage.setItem(cacheKey(role), JSON.stringify(preference));
    const timer = window.setTimeout(() => {
      fetch(endpoint, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(preference),
      }).catch(() => undefined);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [endpoint, preference, role]);

  return {
    preference,
    setPreference,
    reset: () => setPreference(defaultTablePreference(role)),
  };
}
