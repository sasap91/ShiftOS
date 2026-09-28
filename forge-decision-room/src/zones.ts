/**
 * Plant floor zone master (V-01).
 *
 * The spatial twin of the order table: the table says *what* is at risk, the
 * floor shows *where*. Fixture zone set derived from the authoritative floor-plan
 * illustration (single site YYC-01, material-flow order left→right). Ids are
 * fixture ids; the illustration settles the labels and order, and folds CDU
 * electronics into the CDU cell (no separate electronics zone).
 *
 * No source fact is created here: every zone's live figure is a *count of the
 * commitments bound to it*, computed from the same ledger the table renders.
 */
import type { LedgerRow } from "./ledger";
import type { RoleLens } from "./model";

export type FlowStage =
  | "Receiving"
  | "Kitting"
  | "Assembly"
  | "Test"
  | "FAT"
  | "Ship"
  | "MRB"
  | "Rework";

export type Zone = {
  id: string;
  label: string;
  role: string;
  stage: FlowStage;
  /** Schematic geometry in the 1240×680 plan space. */
  x: number;
  y: number;
  w: number;
  h: number;
  resources: string[];
};

export const ZONES: Zone[] = [
  { id: "ZN-01", label: "Receiving + IQC", role: "inbound + incoming quality", stage: "Receiving", x: 81, y: 40, w: 155, h: 252, resources: [] },
  { id: "ZN-02", label: "Controlled Supermarket + Kitting", role: "material staging + kitting", stage: "Kitting", x: 251, y: 40, w: 165, h: 252, resources: [] },
  { id: "ZN-03", label: "Cold-Plate Loop Line", role: "CPL-480 assembly", stage: "Assembly", x: 434, y: 38, w: 440, h: 92, resources: ["RES-ASM-01"] },
  { id: "ZN-04", label: "Manifold Cells", role: "RM-42 assembly", stage: "Assembly", x: 434, y: 148, w: 440, h: 92, resources: ["RES-ASM-02"] },
  { id: "ZN-05", label: "CDU Assembly Cells", role: "CDU-2400 assembly (incl. electronics)", stage: "Assembly", x: 434, y: 252, w: 440, h: 95, resources: ["RES-ASM-01"] },
  { id: "ZN-06", label: "Pressure / Leak / Functional Test", role: "leak + functional test", stage: "Test", x: 891, y: 38, w: 127, h: 314, resources: ["RES-LT-01", "RES-FT-02"] },
  { id: "ZN-07", label: "Thermal / Flow Test", role: "thermal / flow test", stage: "Test", x: 1031, y: 38, w: 117, h: 314, resources: [] },
  { id: "ZN-08", label: "FAT + Documentation", role: "final acceptance + documentation", stage: "FAT", x: 1161, y: 38, w: 125, h: 314, resources: [] },
  { id: "ZN-09", label: "Finished Goods", role: "finished-goods hold", stage: "Ship", x: 1304, y: 38, w: 104, h: 314, resources: [] },
  { id: "ZN-10", label: "Pack + Ship", role: "packing and shipment", stage: "Ship", x: 1421, y: 38, w: 127, h: 314, resources: ["RES-SHIP-01"] },
  { id: "ZN-11", label: "Shipping Staging", role: "outbound staging", stage: "Ship", x: 1294, y: 400, w: 347, h: 147, resources: [] },
  { id: "ZN-12", label: "Quarantine + MRB", role: "nonconformance / MRB", stage: "MRB", x: 104, y: 400, w: 302, h: 147, resources: ["RES-QC-01"] },
  { id: "ZN-13", label: "Rework", role: "controlled rework loop", stage: "Rework", x: 676, y: 400, w: 272, h: 147, resources: [] },
];

export const PLAN = { width: 1648, height: 786 };

const byId = new Map(ZONES.map((zone) => [zone.id, zone]));
export function zoneById(id: string): Zone | undefined {
  return byId.get(id);
}

/** Assembly cell per product family (the three parallel lines). */
const ASSEMBLY_BY_FAMILY: Record<string, string> = {
  "Cold-plate loop": "ZN-03",
  "Rack manifold": "ZN-04",
  CDU: "ZN-05",
};

/**
 * Zones a commitment flows through, from its family and material spine. The
 * exception loop is added when the commitment has an open decision.
 */
export function zonesForRow(row: LedgerRow): string[] {
  const zones = ["ZN-01", "ZN-02", ASSEMBLY_BY_FAMILY[row.family] ?? "ZN-03", "ZN-06"];
  // Thermal/Flow + FAT apply to cold-plate loops and CDUs, not rack manifolds.
  if (row.family !== "Rack manifold") zones.push("ZN-07");
  zones.push("ZN-08", "ZN-09", "ZN-10", "ZN-11");
  if (row.lifecycle === "investigating" || row.lifecycle === "awaiting-approval") zones.push("ZN-12", "ZN-13");
  return zones;
}

export function flowStagesForRow(row: LedgerRow): FlowStage[] {
  return [...new Set(zonesForRow(row).map((id) => byId.get(id)?.stage).filter((stage): stage is FlowStage => Boolean(stage)))];
}

export type ZoneLoad = { count: number; worst: LedgerRow["risk"] | null; ids: string[] };

const RISK_SEVERITY: Record<LedgerRow["risk"], number> = { "at-risk": 3, awaiting: 2, approved: 1, monitoring: 0 };

/** Open-decision load per zone: how many bound commitments still need a decision. */
export function zoneLoad(rows: LedgerRow[]): Map<string, ZoneLoad> {
  const load = new Map<string, ZoneLoad>();
  for (const row of rows) {
    const open = row.lifecycle === "investigating" || row.lifecycle === "awaiting-approval";
    for (const id of zonesForRow(row)) {
      const current = load.get(id) ?? { count: 0, worst: null, ids: [] };
      current.ids.push(row.commitmentId);
      if (open) {
        current.count += 1;
        if (!current.worst || RISK_SEVERITY[row.risk] > RISK_SEVERITY[current.worst]) current.worst = row.risk;
      }
      load.set(id, current);
    }
  }
  return load;
}

export function rowsInZone(rows: LedgerRow[], zoneId: string): LedgerRow[] {
  return rows.filter((row) => zonesForRow(row).includes(zoneId));
}

export const FLOW_STAGES: FlowStage[] = ["Receiving", "Kitting", "Assembly", "Test", "FAT", "Ship", "MRB", "Rework"];

/** Owner function fixture, keyed by the binding constraint class. */
export function ownerOf(row: LedgerRow): string {
  switch (row.constraint.className) {
    case "capacity":
      return "Operations";
    case "material":
      return "Procurement";
    case "quality":
      return "Quality";
    case "gate":
      return "Engineering";
    default:
      return "Planning";
  }
}

export const HORIZONS = [4, 13, 26] as const;
export type Horizon = (typeof HORIZONS)[number];

// --- persona-lensed queue order (U-06) --------------------------------------
const CONSTRAINT_RANK: Record<string, number> = { capacity: 0, material: 1, gate: 2, quality: 2, none: 3 };
const LIFECYCLE_RANK: Record<string, number> = { investigating: 0, "awaiting-approval": 1, approved: 2, executing: 3, monitoring: 4 };

/** The first thing a lens looks at (lower sorts first). */
export function lensPriority(row: LedgerRow, lens: RoleLens): number {
  switch (lens) {
    case "demand":
      return row.capableDeltaDays > 0 ? 0 : 1;
    case "coverage":
      return LIFECYCLE_RANK[row.lifecycle] ?? 9;
    case "throughput":
    case "availability":
      return CONSTRAINT_RANK[row.constraint.className] ?? 9;
  }
}

/** Deterministic lens sort: lens priority, then time-to-impact, then id. */
export function lensSort(rows: LedgerRow[], lens: RoleLens): LedgerRow[] {
  return [...rows].sort(
    (a, b) =>
      lensPriority(a, lens) - lensPriority(b, lens) ||
      a.timeToImpactDays - b.timeToImpactDays ||
      (a.commitmentId < b.commitmentId ? -1 : a.commitmentId > b.commitmentId ? 1 : 0),
  );
}