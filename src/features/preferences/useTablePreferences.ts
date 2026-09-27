import { useEffect, useMemo, useState } from "react";
import type { Role } from "../../model";
import type { TablePreference } from "../../shared/v2";

export const USER_ID = "local-user";
export const DEFAULT_COLUMNS = ["promised", "commitmentId", "product", "qty", "constraint", "risk"];

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
];

export function defaultTablePreference(role: Role): TablePreference {
  return {
    userId: USER_ID,
    role,
    visibleColumns: [...DEFAULT_COLUMNS],
    columnOrder: [...ALL_COLUMNS],
    widths: {
      promised: 82,
      commitmentId: 112,
      product: 124,
      qty: 60,
      constraint: 150,
      risk: 80,
      customer: 160,
      program: 140,
      capable: 104,
      onTimeQty: 96,
      lifecycle: 130,
      provenance: 150,
    },
    pinnedColumns: ["commitmentId"],
    sort: [],
  };
}

function cacheKey(role: Role): string {
  return `forge-v2:table:${USER_ID}:${role}`;
}

function fromCache(role: Role): TablePreference {
  try {
    const raw = window.localStorage.getItem(cacheKey(role));
    if (!raw) return defaultTablePreference(role);
    return { ...defaultTablePreference(role), ...(JSON.parse(raw) as TablePreference), userId: USER_ID, role };
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
        if (active && payload.preference) setPreference(payload.preference);
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
