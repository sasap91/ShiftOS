/**
 * Reference (master) data.
 * Slow, shared, versioned, and effective-dated definitions — distinct from
 * transaction data, which is fast and timestamped. Master data is cited by
 * id and validated against the snapshot as-of; it is never "stale."
 */
import { AS_OF } from "./model";

export const MASTER_SET_VERSION = "MS-2026-09-26";

export type MasterClass =
  | "item"
  | "bom"
  | "routing"
  | "resource"
  | "calendar"
  | "sourcing"
  | "party"
  | "commercial"
  | "policy";

export type MasterValidity = "current" | "effective-from" | "superseded";

export type MasterRef = {
  id: string;
  set: MasterClass;
  recordId: string;
  label: string;
  version: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  supersededBy: string | null;
  statement: string;
};

function ref(partial: Omit<MasterRef, "effectiveTo" | "supersededBy"> & Partial<Pick<MasterRef, "effectiveTo" | "supersededBy">>): MasterRef {
  return { effectiveTo: null, supersededBy: null, ...partial };
}

const ITEM_CPL480: MasterRef = ref({
  id: "ITEM-CPL-480",
  set: "item",
  recordId: "ITEM-CPL-480",
  label: "CPL-480 cold-plate loop",
  version: "v6",
  effectiveFrom: "2026-05-04",
  statement: "CPL-480 is a high-volume cold-plate loop; uom is loops.",
});

const BOM_CPL480: MasterRef = ref({
  id: "BOM-CPL480-QD220",
  set: "bom",
  recordId: "BOM-CPL-480",
  label: "CPL-480 → QD-220 ×2",
  version: "v4",
  effectiveFrom: "2026-08-12",
  statement: "Each CPL-480 consumes two QD-220 pieces.",
});

const SOURCING_QD220: MasterRef = ref({
  id: "AVL-QD-220",
  set: "sourcing",
  recordId: "AVL-3",
  label: "QD-220 approved sources",
  version: "AVL-3",
  effectiveFrom: "2026-09-02",
  statement: "Only approved sources count as eligible QD-220 supply.",
});

const RESOURCE_LT01: MasterRef = ref({
  id: "RM-RES-LT-01",
  set: "resource",
  recordId: "RM-11",
  label: "RES-LT-01 leak-test stand",
  version: "RM-11",
  effectiveFrom: "2026-07-01",
  statement: "Demonstrated capacity is 32 leak tests per full business day.",
});

const CALENDAR_W39: MasterRef = ref({
  id: "CAL-26W39",
  set: "calendar",
  recordId: "CAL-26W39",
  label: "Working calendar 28 Sep–14 Oct",
  version: "CAL-26W39",
  effectiveFrom: "2026-09-15",
  statement: "6 healthy business days, then 7 degraded days at half rate.",
});

const POLICY_ELIG: MasterRef = ref({
  id: "POL-ELIG",
  set: "policy",
  recordId: "POL-ELIG",
  label: "Eligibility policy",
  version: "v2",
  effectiveFrom: "2026-01-01",
  statement: "Held, failed, expired, or unqualified supply is not eligible.",
});

const RATE_OT_LT: MasterRef = ref({
  id: "FIN-RATE-OT-LT",
  set: "commercial",
  recordId: "FIN-RATE-OT-LT",
  label: "Leak-test overtime rate",
  version: "v1",
  effectiveFrom: "2026-09-01",
  statement: "92 CAD per hour at a 1.5 premium. Versioned estimate, not a booked actual.",
});

const BOM_RM42: MasterRef = ref({
  id: "BOM-RM42-MV14",
  set: "bom",
  recordId: "BOM-RM-42",
  label: "RM-42 → MV-14 ×1",
  version: "v2",
  effectiveFrom: "2026-06-15",
  statement: "Each RM-42 manifold consumes one MV-14.",
});

const PARTY_SUP_MV14: MasterRef = ref({
  id: "SUP-MV14",
  set: "party",
  recordId: "SUP-MV14",
  label: "MV-14 supplier master",
  version: "v5",
  effectiveFrom: "2026-04-01",
  statement: "Confirmed supplier commit is the only usable inbound date for MV-14.",
});

const SOURCING_ALT_MV14B: MasterRef = ref({
  id: "AVL-MV-14B",
  set: "sourcing",
  recordId: "AVL-MV-14B",
  label: "MV-14B approved alternate",
  version: "AVL-MV-14B",
  effectiveFrom: "2026-09-12",
  statement: "MV-14B is an approved substitution for MV-14 on RM-42.",
});

const BOM_CDU2400: MasterRef = ref({
  id: "BOM-CDU2400",
  set: "bom",
  recordId: "BOM-CDU-2400",
  label: "CDU-2400 → 2 leak tests/unit",
  version: "v3",
  effectiveFrom: "2026-03-20",
  statement: "Each CDU-2400 requires two leak tests.",
});

const POLICY_FROZEN: MasterRef = ref({
  id: "POL-FROZEN",
  set: "policy",
  recordId: "POL-FROZEN",
  label: "Frozen-horizon policy",
  version: "v1",
  effectiveFrom: "2026-01-01",
  statement: "Frozen-horizon released work cannot be displaced.",
});

const ITEM_CPL320: MasterRef = ref({
  id: "ITEM-CPL-320",
  set: "item",
  recordId: "ITEM-CPL-320",
  label: "CPL-320 cold-plate loop",
  version: "v6",
  effectiveFrom: "2026-05-04",
  statement: "CPL-320 is a cold-plate loop; uom is loops.",
});

const PARTY_SUP_0991: MasterRef = ref({
  id: "SUP-NOV-ASN",
  set: "party",
  recordId: "SUP-0991",
  label: "November supplier master",
  version: "v2",
  effectiveFrom: "2026-08-01",
  statement: "The November ASN is the governing inbound signal for this bucket.",
});

const BY_COMMITMENT: Record<string, MasterRef[]> = {
  "COM-1042": [
    ITEM_CPL480,
    BOM_CPL480,
    SOURCING_QD220,
    RESOURCE_LT01,
    CALENDAR_W39,
    POLICY_ELIG,
    RATE_OT_LT,
  ],
  "COM-1018": [BOM_RM42, PARTY_SUP_MV14, SOURCING_ALT_MV14B],
  "COM-1104": [BOM_CDU2400, POLICY_FROZEN],
  "COM-0991": [ITEM_CPL320, PARTY_SUP_0991],
};

/**
 * A superseded prior version, kept for lineage and never deleted (D-21 exemplar).
 * It is not part of any commitment's active rule set, so it never influences a run.
 */
const RESOURCE_LT01_PRIOR: MasterRef = ref({
  id: "RM-RES-LT-01-PRIOR",
  set: "resource",
  recordId: "RM-RES-LT-01",
  label: "RES-LT-01 leak-test stand (prior rate)",
  version: "RM-10",
  effectiveFrom: "2026-01-01",
  effectiveTo: "2026-06-30",
  supersededBy: "RM-RES-LT-01",
  statement: "Prior demonstrated capacity: 24 leak tests per full business day. Superseded by RM-11 on 1 July 2026.",
});

const MASTER_LINEAGE: MasterRef[] = [RESOURCE_LT01_PRIOR];

export function masterRefsFor(commitmentId: string): MasterRef[] {
  return BY_COMMITMENT[commitmentId] ?? [];
}

/** Every master ref, active plus historical lineage, de-duplicated by id. */
export function allMasterRefs(): MasterRef[] {
  const byId = new Map<string, MasterRef>();
  for (const group of Object.values(BY_COMMITMENT)) {
    for (const master of group) byId.set(master.id, master);
  }
  for (const master of MASTER_LINEAGE) if (!byId.has(master.id)) byId.set(master.id, master);
  return [...byId.values()];
}

export function validityOf(master: MasterRef, asOf: string = AS_OF): MasterValidity {
  if (master.supersededBy) return "superseded";
  if (asOf < master.effectiveFrom) return "effective-from";
  if (master.effectiveTo && asOf > master.effectiveTo) return "superseded";
  return "current";
}

export function validityLabel(master: MasterRef, asOf: string = AS_OF): string {
  const state = validityOf(master, asOf);
  if (state === "current") return `${master.version} · current`;
  if (state === "effective-from") return `${master.version} · effective ${master.effectiveFrom}`;
  return `${master.version} · superseded`;
}