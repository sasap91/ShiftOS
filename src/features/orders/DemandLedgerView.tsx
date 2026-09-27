import { Fragment, useMemo, useState } from "react";
import { formatDay } from "../../model";
import type { DemandProjectionRow } from "../../shared/v2";

type DemandColumn =
  | "requestedDate"
  | "promisedDate"
  | "capableDate"
  | "promiseToCapableDays"
  | "commitmentId"
  | "product"
  | "qty"
  | "pegged"
  | "unpegged"
  | "priority"
  | "requestToPromiseDays"
  | "workOrders"
  | "status"
  | "riskState";

const COLUMNS: { key: DemandColumn; label: string; width: number }[] = [
  { key: "requestedDate", label: "Requested", width: 100 },
  { key: "promisedDate", label: "Promise", width: 100 },
  { key: "capableDate", label: "Capable", width: 122 },
  { key: "promiseToCapableDays", label: "Promise gap", width: 92 },
  { key: "commitmentId", label: "Order", width: 112 },
  { key: "product", label: "Product", width: 118 },
  { key: "qty", label: "Qty", width: 72 },
  { key: "pegged", label: "Pegged", width: 78 },
  { key: "unpegged", label: "Unpegged", width: 86 },
  { key: "priority", label: "Priority", width: 72 },
  { key: "requestToPromiseDays", label: "Lead", width: 72 },
  { key: "workOrders", label: "Work orders", width: 152 },
  { key: "status", label: "Status", width: 104 },
  { key: "riskState", label: "State", width: 88 },
];

const STATE_LABEL: Record<DemandProjectionRow["riskState"], string> = {
  AT_RISK: "At risk",
  WATCH: "Watch",
  ON_TRACK: "On track",
};

function value(row: DemandProjectionRow, key: DemandColumn): string | number {
  if (key === "requestedDate" || key === "promisedDate") return row[key];
  if (key === "capableDate") return row.capableDate ?? "9999-12-31";
  if (key === "promiseToCapableDays") return row.promiseToCapableDays ?? Number.MAX_SAFE_INTEGER;
  if (key === "unpegged") return Math.max(0, row.qty - row.pegged);
  if (key === "workOrders") return row.workOrders.join(" ");
  if (key === "riskState") return { AT_RISK: 0, WATCH: 1, ON_TRACK: 2 }[row.riskState];
  return row[key];
}

function dateGap(days: number | null) {
  if (days === null) return "Not established";
  if (days === 0) return "On promise";
  return `${days > 0 ? "+" : ""}${days}d`;
}

export function DemandLedgerView({ rows, loading }: { rows: DemandProjectionRow[]; loading: boolean }) {
  const [sort, setSort] = useState<{ key: DemandColumn; direction: "asc" | "desc" }>({ key: "promisedDate", direction: "asc" });
  const [open, setOpen] = useState<string | null>(null);
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
        <caption><strong>Demand commitments</strong> · {sorted.length} active orders</caption>
        <colgroup>
          {COLUMNS.map((column) => <col key={column.key} style={{ width: column.width }} />)}
        </colgroup>
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
          {sorted.map((row) => {
            const expanded = open === row.commitmentId;
            const unpegged = Math.max(0, row.qty - row.pegged);
            return (
              <Fragment key={row.commitmentId}>
                <tr className={`demand-${row.riskState.toLowerCase().replace("_", "-")}`}>
                  <td>{formatDay(row.requestedDate)}</td>
                  <td>{formatDay(row.promisedDate)}</td>
                  <td>{row.capableDate ? formatDay(row.capableDate) : "Not established"}</td>
                  <td>{dateGap(row.promiseToCapableDays)}</td>
                  <td className="mono-cell">
                    <button
                      type="button"
                      className="demand-order-toggle"
                      aria-expanded={expanded}
                      onClick={() => setOpen(expanded ? null : row.commitmentId)}
                    >
                      <span aria-hidden="true">{expanded ? "⌄" : "›"}</span>{row.commitmentId}
                    </button>
                  </td>
                  <td>{row.product}</td>
                  <td>{row.qty}<small> EA</small></td>
                  <td>{row.pegged}<small> EA</small></td>
                  <td>{unpegged}<small> EA</small></td>
                  <td>{row.priority}</td>
                  <td>{row.requestToPromiseDays}d</td>
                  <td className="mono-cell" title={row.workOrders.join(", ")}>{row.workOrders.length ? row.workOrders.join(", ") : "Not released"}</td>
                  <td>{row.status.replaceAll("_", " ").toLowerCase()}</td>
                  <td title={row.riskReason ?? row.status}>{row.active ? STATE_LABEL[row.riskState] : row.status.replaceAll("_", " ").toLowerCase()}</td>
                </tr>
                {expanded ? (
                  <tr className="demand-detail-row">
                    <td colSpan={COLUMNS.length}>
                      <table className="demand-detail-table" aria-label={`${row.commitmentId} demand details`}>
                        <tbody>
                          <tr><th scope="row">Date chain</th><td>Requested {formatDay(row.requestedDate)} · promised {formatDay(row.promisedDate)} · capable {row.capableDate ? formatDay(row.capableDate) : "not established"}</td><td>{row.requestToPromiseDays}d request-to-promise · {dateGap(row.promiseToCapableDays)} promise-to-capable</td></tr>
                          <tr><th scope="row">Demand and peg</th><td>{row.qty} EA demand · {row.pegged} EA pegged · {unpegged} EA unpegged</td><td>{row.priority}</td></tr>
                          <tr><th scope="row">Execution</th><td>{row.workOrders.length ? row.workOrders.join(", ") : "No released work order"}</td><td>{row.status.replaceAll("_", " ").toLowerCase()}</td></tr>
                          <tr><th scope="row">Risk basis</th><td>{STATE_LABEL[row.riskState]}</td><td>{row.riskReason ?? "No open risk reason"}</td></tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
          {!loading && !sorted.length ? (
            <tr><td colSpan={COLUMNS.length} className="demand-empty">No demand commitments match this scope.</td></tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
