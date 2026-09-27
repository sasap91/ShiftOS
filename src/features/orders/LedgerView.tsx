import { useMemo, useState, type CSSProperties, type KeyboardEvent } from "react";
import { formatDay, type Role, type RoleLens } from "../../model";
import type { LedgerRow } from "../../ledger";
import type { Thread } from "../../orchestrator";
import { ROLE_DEFAULT_COLUMNS, useTablePreferences } from "../preferences/useTablePreferences";

type SortDirection = "asc" | "desc";

const LABELS: Record<string, string> = {
  promised: "Promise",
  commitmentId: "Order",
  product: "Product",
  qty: "Qty",
  constraint: "Constraint",
  risk: "State",
  customer: "Customer",
  program: "Program",
  capable: "Capable",
  onTimeQty: "On-time qty",
  lifecycle: "Lifecycle",
  provenance: "Evidence",
  gapQty: "Commit gap",
  workCenter: "Work center",
  requiredLoad: "Required load",
  allocatedLoad: "Allocated load",
  loadGap: "Load gap",
  asset: "Asset",
  assetStatus: "Availability",
  impactQty: "Impact qty",
  recovery: "Recovery",
};

const ROLE_VIEW_LABEL: Record<Role, string> = {
  "manufacturing-manager": "Manufacturing control",
  "shift-planner": "Shift execution",
  "maintenance-manager": "Asset readiness",
  "demand-planner": "Demand commitments",
};

const STATE_LABEL: Record<LedgerRow["risk"], string> = {
  "at-risk": "At risk",
  awaiting: "Awaiting",
  approved: "Approved",
  monitoring: "Monitoring",
};

const RISK_ORDER: LedgerRow["risk"][] = ["at-risk", "awaiting", "approved", "monitoring"];

function displayValue(row: LedgerRow, key: string, role: Role): string | number {
  if (key === "promised") return formatDay(row.promised);
  if (key === "commitmentId") return row.commitmentId;
  if (key === "product") return row.product;
  if (key === "qty") return row.qty;
  if (key === "constraint") return row.constraint.label;
  if (key === "risk") return STATE_LABEL[row.risk];
  if (key === "customer") return role === "shift-planner" || role === "maintenance-manager" ? "Restricted — NOT_AUTHORIZED" : row.customer;
  if (key === "program") return row.program;
  if (key === "capable") return formatDay(row.capable);
  if (key === "onTimeQty") return row.onTimeQty;
  if (key === "lifecycle") return row.lifecycle.replaceAll("-", " ");
  if (key === "provenance") return `${row.provenance.fresh} fresh · ${row.provenance.stale} stale`;
  if (key === "gapQty") return row.operational.impactQty;
  if (key === "workCenter") return row.operational.workCenter;
  if (key === "requiredLoad") return row.operational.requiredLoad;
  if (key === "allocatedLoad") return row.operational.allocatedLoad;
  if (key === "loadGap") return row.operational.loadGap;
  if (key === "asset") return row.operational.asset;
  if (key === "assetStatus") return row.operational.assetStatus;
  if (key === "impactQty") return row.operational.assetImpactQty;
  if (key === "recovery") return row.operational.recovery;
  return "—";
}

function compareValue(row: LedgerRow, key: string, role: Role): string | number {
  if (key === "risk") return RISK_ORDER.indexOf(row.risk);
  if (key === "promised" || key === "capable") return row[key];
  if (["gapQty", "requiredLoad", "allocatedLoad", "loadGap", "impactQty"].includes(key)) return Number(displayValue(row, key, role));
  return displayValue(row, key, role);
}

function cellClass(key: string, row?: LedgerRow): string {
  const classes = [`cell-${key}`];
  if (key === "commitmentId") classes.push("mono-cell");
  if (key === "risk" && row) classes.push("state", row.risk);
  return classes.join(" ");
}

export function LedgerView({
  rows,
  threads,
  activeId,
  role,
  lens,
  focusTarget,
  onFocus,
  onSelect,
}: {
  rows: LedgerRow[];
  threads: Record<string, Thread>;
  activeId: string;
  role: Role;
  lens: RoleLens;
  focusTarget: string | null;
  onFocus: (key: string) => void;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const { preference, setPreference, reset } = useTablePreferences(role);
  const visible = preference.columnOrder.filter((key) => preference.visibleColumns.includes(key));
  const sort = preference.sort[0];
  const template = visible.map((key) => `${preference.widths[key] ?? 120}px`).join(" ");

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const copy = [...rows].sort((a, b) => {
      const av = compareValue(a, sort.key, role);
      const bv = compareValue(b, sort.key, role);
      return av < bv ? -1 : av > bv ? 1 : 0;
    });
    return sort.direction === "desc" ? copy.reverse() : copy;
  }, [rows, role, sort]);

  function setSort(key: string) {
    const next: SortDirection = sort?.key === key && sort.direction === "asc" ? "desc" : "asc";
    setPreference({ ...preference, sort: [{ key, direction: next }] });
  }

  function moveColumn(key: string, delta: -1 | 1) {
    const order = [...preference.columnOrder];
    const index = order.indexOf(key);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= order.length) return;
    [order[index], order[target]] = [order[target], order[index]];
    setPreference({ ...preference, columnOrder: order });
  }

  function toggleColumn(key: string) {
    const shown = preference.visibleColumns.includes(key);
    if (shown && preference.visibleColumns.length === 1) return;
    setPreference({
      ...preference,
      visibleColumns: shown ? preference.visibleColumns.filter((column) => column !== key) : [...preference.visibleColumns, key],
    });
  }

  function moveFocus(event: KeyboardEvent<HTMLDivElement>, index: number) {
    const lines = event.currentTarget.closest(".ledger")?.querySelectorAll<HTMLElement>(".ledger-line");
    if (!lines?.length) return;
    let next = index;
    if (event.key === "ArrowDown") next = Math.min(lines.length - 1, index + 1);
    else if (event.key === "ArrowUp") next = Math.max(0, index - 1);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = lines.length - 1;
    else if (event.key === "Escape") {
      setOpen(null);
      event.preventDefault();
      return;
    } else return;
    lines[next]?.focus();
    event.preventDefault();
  }

  const gridStyle = { "--ledger-columns": template } as CSSProperties;

  return (
    <div className={`ledger lens-${lens}`} role="table" aria-label="All order details" aria-rowcount={sorted.length} style={gridStyle}>
      <div className="ledger-tools">
        <span><strong>{ROLE_VIEW_LABEL[role]}</strong> · {sorted.length} orders</span>
        <details className="column-menu">
          <summary>Columns · {visible.length}</summary>
          <div className="column-popover">
            <header>
              <strong>Table columns</strong>
              <button type="button" onClick={reset}>Reset</button>
            </header>
            {preference.columnOrder.map((key) => (
              <div className="column-option" key={key}>
                <label>
                  <input type="checkbox" checked={preference.visibleColumns.includes(key)} onChange={() => toggleColumn(key)} />
                  {LABELS[key]}
                </label>
                <div>
                  <button type="button" aria-label={`Move ${LABELS[key]} left`} onClick={() => moveColumn(key, -1)}>←</button>
                  <button type="button" aria-label={`Move ${LABELS[key]} right`} onClick={() => moveColumn(key, 1)}>→</button>
                </div>
                <label className="width-control">
                  Width
                  <input
                    type="range"
                    min="72"
                    max="260"
                    value={preference.widths[key] ?? 120}
                    onChange={(event) => setPreference({
                      ...preference,
                      widths: { ...preference.widths, [key]: Number(event.target.value) },
                    })}
                  />
                </label>
                <label className="pin-control">
                  <input
                    type="checkbox"
                    checked={preference.pinnedColumns.includes(key)}
                    onChange={() => setPreference({
                      ...preference,
                      pinnedColumns: preference.pinnedColumns.includes(key)
                        ? preference.pinnedColumns.filter((column) => column !== key)
                        : [key],
                    })}
                  />
                  Pin
                </label>
              </div>
            ))}
            <p>{ROLE_VIEW_LABEL[role]} default: {ROLE_DEFAULT_COLUMNS[role].map((key) => LABELS[key]).join(" · ")}</p>
          </div>
        </details>
      </div>

      <div className="ledger-head" role="row">
        {visible.map((key) => (
          <span key={key} role="columnheader" className={preference.pinnedColumns.includes(key) ? "pinned" : ""}>
            <button type="button" className="col-sort" onClick={() => setSort(key)}>
              {LABELS[key]}
              {sort?.key === key ? <em>{sort.direction === "asc" ? "↑" : "↓"}</em> : null}
            </button>
          </span>
        ))}
      </div>

      {!sorted.length ? (
        <p className="ledger-empty" role="status">No orders match this scope. Clear a filter to widen the table.</p>
      ) : sorted.map((row, index) => {
        const expanded = open === row.commitmentId;
        return (
          <div className={`ledger-row ${row.risk}${row.commitmentId === activeId ? " active" : ""}`} role="row" key={row.commitmentId}>
            <div
              className="ledger-line"
              tabIndex={0}
              role="button"
              aria-expanded={expanded}
              onClick={() => {
                onSelect(row.commitmentId);
                setOpen(expanded ? null : row.commitmentId);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(row.commitmentId);
                  setOpen(expanded ? null : row.commitmentId);
                } else moveFocus(event, index);
              }}
            >
              {visible.map((key) => {
                const focusKey = `${row.commitmentId}:${key}`;
                return (
                  <span
                    key={key}
                    role="cell"
                    className={`${cellClass(key, row)}${preference.pinnedColumns.includes(key) ? " pinned" : ""}${focusTarget === focusKey ? " hot" : ""}`}
                    onClick={key === "constraint" || key === "commitmentId" ? (event) => {
                      event.stopPropagation();
                      onFocus(focusKey);
                    } : undefined}
                  >
                    {key === "commitmentId" ? <span className="row-caret" aria-hidden="true">{expanded ? "⌄" : "›"}</span> : null}
                    {displayValue(row, key, role)}
                    {key === "qty" || key === "onTimeQty" || key === "gapQty" || key === "impactQty" ? <small>{row.uom}</small> : null}
                    {key === "requiredLoad" || key === "allocatedLoad" || key === "loadGap" ? <small>{row.operational.loadUnit}</small> : null}
                  </span>
                );
              })}
            </div>
            {expanded ? <LedgerDetail row={row} thread={threads[row.commitmentId]} role={role} /> : null}
          </div>
        );
      })}
    </div>
  );
}

function DetailTable({ rows }: { rows: { label: string; value: string | number; note?: string }[] }) {
  return (
    <table className="detail-table">
      <tbody>
        {rows.map((row) => (
          <tr key={`${row.label}-${row.value}`}>
            <th scope="row">{row.label}</th>
            <td>{row.value}</td>
            <td>{row.note ?? ""}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function LedgerDetail({ row, thread, role }: { row: LedgerRow; thread: Thread; role: Role }) {
  const customer = role === "shift-planner" || role === "maintenance-manager" ? "Restricted — NOT_AUTHORIZED" : row.customer;
  const latestRun = thread.runs.at(-1);
  return (
    <div className="ledger-detail">
      {role === "manufacturing-manager" ? (
        <section>
          <h3>Manufacturing control</h3>
          <DetailTable rows={[
            { label: "Priority", value: `P${row.operational.priority}` },
            { label: "Feasibility", value: row.feasibility, note: row.lifecycle.replaceAll("-", " ") },
            { label: "On-time quantity", value: row.onTimeQty, note: row.uom },
            { label: "Commit gap", value: row.operational.impactQty, note: row.uom },
            { label: "Binding constraint", value: row.constraint.label, note: row.constraint.className },
            { label: "Capable date", value: formatDay(row.capable), note: `${row.capableDeltaDays >= 0 ? "+" : ""}${row.capableDeltaDays} days vs promise` },
          ]} />
        </section>
      ) : null}

      {role === "shift-planner" ? (
        <section>
          <h3>Shift execution and capacity</h3>
          <DetailTable rows={[
            { label: "Work center", value: row.operational.workCenter },
            { label: "Priority", value: `P${row.operational.priority}` },
            { label: "Required load", value: row.operational.requiredLoad, note: row.operational.loadUnit },
            { label: "Allocated load", value: row.operational.allocatedLoad, note: row.operational.loadUnit },
            { label: "Load gap", value: row.operational.loadGap, note: row.operational.loadUnit },
            { label: "Crew coverage", value: row.operational.crewStatus },
          ]} />
        </section>
      ) : null}

      {role === "maintenance-manager" ? (
        <section>
          <h3>Asset availability and production impact</h3>
          <DetailTable rows={[
            { label: "Asset", value: row.operational.asset },
            { label: "Availability", value: row.operational.assetStatus },
            { label: "Recovery", value: row.operational.recovery },
            { label: "Asset-attributed impact", value: row.operational.assetImpactQty, note: row.uom },
            { label: "Capable date", value: formatDay(row.capable), note: `${row.capableDeltaDays >= 0 ? "+" : ""}${row.capableDeltaDays} days vs promise` },
            { label: "Asset evidence", value: row.operational.assetEvidence },
          ]} />
        </section>
      ) : null}

      <section>
        <h3>Promise and order</h3>
        <DetailTable rows={[
          { label: "Order", value: row.commitmentId, note: row.program },
          { label: "Customer", value: customer },
          { label: "Approved promise", value: formatDay(row.promised), note: `T-${row.timeToImpactDays} days` },
          { label: "Capable date", value: formatDay(row.capable), note: `${row.capableDeltaDays >= 0 ? "+" : ""}${row.capableDeltaDays} days` },
        ]} />
      </section>

      <section>
        <h3>Demand, supply and commitment</h3>
        <DetailTable rows={row.ladder.map((item) => ({ label: item.label, value: item.value ?? "Not established", note: item.unit }))} />
      </section>

      <section>
        <h3>Materials, routing and capacity</h3>
        <DetailTable rows={[
          { label: "Binding constraint", value: row.constraint.label, note: row.constraint.className },
          { label: "Resource", value: row.constraint.resource ?? "Not binding" },
          { label: "Required", value: row.constraint.required ?? "—", note: row.constraint.unit },
          { label: "Allocated", value: row.constraint.allocated ?? "—", note: row.constraint.unit },
          { label: "Shortfall", value: row.constraint.shortfall, note: row.constraint.unit },
          ...row.constraint.secondaries.map((item, index) => ({ label: `Secondary ${index + 1}`, value: item })),
        ]} />
      </section>

      <section>
        <h3>Quality, gates and evidence gaps</h3>
        <DetailTable rows={[
          ...(row.constraint.gates.length ? row.constraint.gates.map((item) => ({ label: "Gate", value: item })) : [{ label: "Gate", value: "No open hard gate recorded" }]),
          ...(row.conflicts.length ? row.conflicts.map((item) => ({ label: "Conflict", value: item.statement, note: item.disposition })) : [{ label: "Conflict", value: "No unresolved conflict" }]),
          ...(row.missing.length ? row.missing.map((item) => ({ label: "Missing", value: item })) : [{ label: "Missing", value: "No declared evidence gap" }]),
        ]} />
      </section>

      <section>
        <h3>Scenarios and alternatives</h3>
        <DetailTable rows={latestRun?.alternatives.length ? latestRun.alternatives.map((option) => ({
          label: option.id,
          value: option.label,
          note: `${option.feasibility} · ship ${formatDay(option.shipDate)}`,
        })) : [{ label: latestRun?.id ?? "No run", value: "Baseline", note: latestRun?.feasibility ?? "Not established" }]} />
      </section>

      <section>
        <h3>Approvals, receipts and outcomes</h3>
        <DetailTable rows={[
          ...thread.approvals.map((item) => ({ label: item.id, value: item.status, note: item.requestRationale })),
          ...thread.receipts.map((item) => ({ label: item.id, value: `${item.mode} · ${item.status}`, note: item.detail })),
          ...thread.outcomes.map((item) => ({ label: item.id, value: item.observed, note: item.reason })),
          ...(!thread.approvals.length && !thread.receipts.length && !thread.outcomes.length ? [{ label: "Audit", value: "No governed action recorded" }] : []),
        ]} />
      </section>

      <section>
        <h3>Source records and calculations</h3>
        <DetailTable rows={[
          ...row.lanes.flatMap((lane) => lane.facts.map((fact) => ({ label: `${lane.system} · ${fact.recordId}`, value: fact.statement, note: `${fact.freshness} · ${fact.observedAt.slice(0, 16).replace("T", " ")}` }))),
          ...row.derived.map((item) => ({ label: item.id, value: item.result, note: item.formula })),
        ]} />
      </section>
    </div>
  );
}
