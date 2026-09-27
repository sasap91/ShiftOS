import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { DemandProjectionRow } from "../../src/shared/v2";

type Projection = {
  active: boolean;
  capableDate: string | null;
  commitmentId: string;
  priority: string;
  promiseToCapableDays: number | null;
  promisedDate: string;
  requestToPromiseDays: number;
  requestedDate: string;
  status: string;
  workOrders: string[];
};

type Demand = { id: string; product: string; qty: number; pegged: number };

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field);
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      field = "";
    } else field += char;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function canonicalRisk(): Map<string, { riskState: DemandProjectionRow["riskState"]; riskReason: string | null }> {
  const csv = readFileSync(resolve(process.cwd(), "tools/gurobi/fixtures/contract/canonical_commitment.csv"), "utf8");
  const [headers, ...rows] = parseCsv(csv);
  const position = Object.fromEntries(headers.map((header, index) => [header, index]));
  return new Map(rows.map((row) => [
    row[position.commitment_id],
    {
      riskState: (row[position.risk_state] || "ON_TRACK") as DemandProjectionRow["riskState"],
      riskReason: row[position.risk_reason] || null,
    },
  ]));
}

export function getDemandProjection(): DemandProjectionRow[] {
  const projection = JSON.parse(
    readFileSync(resolve(process.cwd(), "tools/gurobi/out/demand_projection.json"), "utf8"),
  ) as { projection: Projection[] };
  const allocationInput = JSON.parse(
    readFileSync(resolve(process.cwd(), "tools/gurobi/fixtures/aib/aib_allocation_input.json"), "utf8"),
  ) as { demands: Demand[] };
  const demandById = new Map(allocationInput.demands.map((row) => [row.id, row]));
  const riskById = canonicalRisk();

  return projection.projection.map((row) => {
    const demand = demandById.get(row.commitmentId);
    const risk = riskById.get(row.commitmentId) ?? { riskState: "ON_TRACK" as const, riskReason: null };
    return {
      ...row,
      product: demand?.product ?? "Not established",
      qty: demand?.qty ?? 0,
      pegged: demand?.pegged ?? 0,
      ...risk,
    };
  });
}
