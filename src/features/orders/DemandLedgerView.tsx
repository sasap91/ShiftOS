import { useMemo, useState } from "react";
import { formatDay } from "../../model";
import type { DemandProjectionRow } from "../../shared/v2";

type DemandColumn = "requestedDate" | "promisedDate" | "commitmentId" | "product" | "qty" | "capableDate" | "riskState";

const COLUMNS: { key: DemandColumn; label: string }[] = [
  { key: "requestedDate", label: "Requested" },
  { key: "promisedDate", label: "Promise" },
  { key: "commitmentId", label: "Order" },
  { key: "product", label: "Product" },
  { key: "qty", label: "Qty" },
  { key: "capableDate", label: "Capable" },
  { key: "riskState", label: "State" },
];

const STATE_LABEL: Record<DemandProjectionRow["riskState"], string> = {
  AT_RISK: "At risk",
  WATCH: "Watch",
  ON_TRACK: "On track",
};

function value(row: DemandProjectionRow, key: DemandColumn): string | number {
  if (key === "requestedDate" || key === "promisedDate") return row[key];
  if (key === "capableDate") return row.capableDate ?? "9999-12-31";
  if (key === "riskState") return { AT_RISK: 0, WATCH: 1, ON_TRACK: 2 }[row.riskState];
  return row[key];
}

export function DemandLedgerView({ rows, loading }: { rows: DemandProjectionRow[]; loading: boolean }) {
  const [sort, setSort] = useState<{ key: DemandColumn; direction: "asc" | "desc" }>({ key: "promisedDate", direction: "asc" });
  const sorted = useMemo(() => [...rows].sort((a, b) => {
    const left = value(a, sort.key);
    const right = value(b, sort.key);
    const result = left < right ? -1 : left > right ? 1 : 0;
    return sort.direction === "asc" ? result : -result;
  }), [rows, sort]);

  function setColumnSort(key: DemandColumn) {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  }

  return (
    <div className="demand-table-scroll">
      <table className="demand-table" aria-label="Demand planner commitments">
        <thead>
          <tr>
            {COLUMNS.map((column) => (
              <th key={column.key} scope="col">
                <button type="button" onClick={() => setColumnSort(column.key)}>
                  {column.label}
                  {sort.key === column.key ? <span aria-hidden="true">{sort.direction === "asc" ? "↑" : "↓"}</span> : null}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={COLUMNS.length} className="demand-empty">Loading demand commitments…</td></tr>
          ) : null}
          {sorted.map((row) => (
            <tr key={row.commitmentId} className={`demand-${row.riskState.toLowerCase().replace("_", "-")}`}>
              <td>{formatDay(row.requestedDate)}</td>
              <td>{formatDay(row.promisedDate)}</td>
              <td className="mono-cell">{row.commitmentId}</td>
              <td>{row.product}</td>
              <td>{row.qty}<small> EA</small></td>
              <td>
                {row.capableDate ? formatDay(row.capableDate) : "Not established"}
                {row.promiseToCapableDays !== null && row.promiseToCapableDays !== 0
                  ? <small>{row.promiseToCapableDays > 0 ? "+" : ""}{row.promiseToCapableDays}d</small>
                  : null}
              </td>
              <td title={row.riskReason ?? row.status}>{row.active ? STATE_LABEL[row.riskState] : row.status.replaceAll("_", " ").toLowerCase()}</td>
            </tr>
          ))}
          {!loading && !sorted.length ? (
            <tr><td colSpan={COLUMNS.length} className="demand-empty">No demand commitments match this scope.</td></tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
