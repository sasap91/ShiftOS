import { useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import { formatDay, formatMoney, type RoleLens } from "./model";
import { validityLabel } from "./master";
import { LIFECYCLE_LABEL, type LedgerRow } from "./ledger";

const RISK_LABEL: Record<LedgerRow["risk"], string> = {
  "at-risk": "At risk",
  awaiting: "Awaiting",
  approved: "Approved",
  monitoring: "Monitoring",
};
const RISK_ORDER: LedgerRow["risk"][] = ["at-risk", "awaiting", "approved", "monitoring"];
const LIFECYCLE_ORDER: LedgerRow["lifecycle"][] = [
  "investigating",
  "awaiting-approval",
  "approved",
  "executing",
  "monitoring",
];

/** Which columns lead for each persona lens (middle-bottom order table). */
const EMPHASIS: Record<RoleLens, string[]> = {
  coverage: ["lifecycle", "lens", "constraint"],
  throughput: ["constraint", "lifecycle", "lens"],
  availability: ["constraint", "lens"],
  demand: ["promised", "lens", "product"],
};

/** The one lens column (T1): a single cell that answers this persona's question. */
const LENS_COLUMN: Record<RoleLens, { label: string; render: (row: LedgerRow) => ReactNode }> = {
  throughput: {
    label: "Recovery",
    render: (row) => {
      const p = row.persona.recovery;
      if (!p.total) return "—";
      const cost = p.costCad !== null ? formatMoney(p.costCad) : "—";
      return `${cost} · ${p.feasible}/${p.total}${p.authority ? ` · ${p.authority}` : ""}`;
    },
  },
  coverage: {
    label: "Coverage",
    render: (row) => {
      const p = row.persona.coverage;
      if (!p.certs && !p.workOrder) return "—";
      return `${p.certs} certs${p.workOrder ? ` · ${p.workOrder}` : ""}`;
    },
  },
  availability: {
    label: "Availability",
    render: (row) => {
      const p = row.persona.availability;
      if (p.event) return `${p.event}${p.resource ? ` · ${p.resource}` : ""}`;
      return p.criticality ?? "—";
    },
  },
  demand: {
    label: "Gap",
    render: (row) => `${formatDay(row.promised)} → ${formatDay(row.capable)}${row.capableDeltaDays > 0 ? ` · +${row.capableDeltaDays}d` : ""} · P${row.persona.demand.priority}`,
  },
};

/** The persona's expanded first tier (T2). */
function personaTier(row: LedgerRow, lens: RoleLens): { title: string; items: string[] } {
  const p = row.persona;
  switch (lens) {
    case "throughput":
      return {
        title: "Manufacturing · recovery",
        items: [
          `Capable ${formatDay(row.capable)} vs promise ${formatDay(row.promised)}${row.capableDeltaDays > 0 ? ` (slip ${row.capableDeltaDays}d)` : ""}`,
          `Binding constraint: ${row.constraint.label}${row.constraint.resource ? ` · ${row.constraint.resource}` : ""}${row.constraint.required ? ` — shortfall ${row.constraint.shortfall}/${row.constraint.required} ${row.constraint.unit}` : ""}`,
          `Recovery cost: ${p.recovery.costCad !== null ? formatMoney(p.recovery.costCad) : "—"} · feasible ${p.recovery.feasible}/${p.recovery.total}`,
          `Authority: ${p.recovery.authority ?? "see the approval card"}`,
        ],
      };
    case "coverage":
      return {
        title: "Shift · coverage",
        items: [
          `Lifecycle: ${LIFECYCLE_LABEL[row.lifecycle]}`,
          `Work order: ${p.coverage.workOrder ?? "— (MES seam D-07)"}`,
          `Coverage: ${p.coverage.certs} certified facts · ${p.coverage.expiring} expiring`,
          `Handover Δ: ${p.coverage.handover ?? "— (shift handover C-03)"}`,
        ],
      };
    case "availability":
      return {
        title: "Maintenance · availability",
        items: [
          `Resource: ${p.availability.resource ?? "—"}`,
          `Downtime event: ${p.availability.event ?? "—"}`,
          `Restoration: ${p.availability.back ?? "— (EAM seam D-08)"}`,
          `Criticality: ${p.availability.criticality ?? "—"}`,
        ],
      };
    case "demand":
      return {
        title: "Demand · gap",
        items: [
          `Requested: ${p.demand.requested ?? "— (CRM requested date D-02)"}`,
          `Promised ${formatDay(p.demand.promised)} → Capable ${formatDay(p.demand.capable)}${p.demand.slipDays > 0 ? ` · +${p.demand.slipDays}d` : " · on plan"}`,
          `Priority: P${p.demand.priority}`,
          `On-time ${row.onTimeQty}/${row.qty} ${row.uom}`,
        ],
      };
  }
}

type SortKey = "risk" | "promised" | "qty" | "lifecycle";

const COLUMNS: { key: string; label: string; sort?: SortKey }[] = [
  { key: "promised", label: "Promise", sort: "promised" },
  { key: "commit", label: "Order", sort: "promised" },
  { key: "product", label: "Product" },
  { key: "lens", label: "" },
  { key: "qty", label: "Qty" },
  { key: "constraint", label: "Constraint" },
  { key: "lifecycle", label: "State", sort: "lifecycle" },
];

function cls(key: string, base: string, lead: Set<string>): string {
  return `${base}${lead.has(key) ? " lead" : ""}`;
}

export function LedgerView({
  rows,
  activeId,
  lens,
  focusTarget,
  onFocus,
  onSelect,
}: {
  rows: LedgerRow[];
  activeId: string;
  lens: RoleLens;
  focusTarget: string | null;
  onFocus: (key: string) => void;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const lead = new Set(EMPHASIS[lens]);

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const value = (row: LedgerRow): number | string => {
      if (sortKey === "risk") return RISK_ORDER.indexOf(row.risk);
      if (sortKey === "lifecycle") return LIFECYCLE_ORDER.indexOf(row.lifecycle);
      if (sortKey === "qty") return row.qty;
      return row.promised;
    };
    const copy = [...rows].sort((a, b) => {
      const av = value(a);
      const bv = value(b);
      return av < bv ? -1 : av > bv ? 1 : 0;
    });
    return sortDir === "desc" ? copy.reverse() : copy;
  }, [rows, sortKey, sortDir]);

  function onSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function moveFocus(event: KeyboardEvent<HTMLDivElement>, index: number) {
    const lines = event.currentTarget.closest(".ledger")?.querySelectorAll<HTMLElement>(".ledger-line");
    if (!lines || !lines.length) return;
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

  if (!rows.length) {
    return (
      <div className="ledger" role="table" aria-label="Order information table">
        <p className="ledger-empty" role="status" aria-live="polite">
          No orders match the current scope. Clear a filter to widen the table.
        </p>
      </div>
    );
  }

  return (
    <div className={`ledger lens-${lens}`} role="table" aria-label="Order information table" aria-rowcount={sorted.length}>
      <div className="ledger-head" role="row">
        {COLUMNS.map((column) => {
          const label = column.key === "lens" ? LENS_COLUMN[lens].label : column.label;
          return (
            <span
              key={column.key}
              role="columnheader"
              aria-sort={column.sort && sortKey === column.sort ? (sortDir === "asc" ? "ascending" : "descending") : undefined}
              className={cls(column.key, column.sort ? "sortable" : "", lead)}
            >
              {column.sort ? (
                <button type="button" className="col-sort" onClick={() => onSort(column.sort!)}>
                  {label}
                  {sortKey === column.sort ? <em className="sort-mark">{sortDir === "asc" ? "▲" : "▼"}</em> : null}
                </button>
              ) : (
                label
              )}
            </span>
          );
        })}
      </div>
      {sorted.map((row, index) => {
        const expanded = open === row.commitmentId;
        const active = row.commitmentId === activeId;
        const constraintFocus = `${row.commitmentId}:constraint`;
        return (
          <div
            key={row.commitmentId}
            className={`ledger-row ${row.risk}${active ? " active" : ""}${expanded ? " open" : ""}`}
            role="row"
          >
            <div
              className="ledger-line"
              role="button"
              tabIndex={0}
              aria-expanded={expanded}
              aria-label={`${row.commitmentId} ${row.customer} — ${RISK_LABEL[row.risk]}`}
              onClick={() => {
                onSelect(row.commitmentId);
                setOpen(expanded ? null : row.commitmentId);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(row.commitmentId);
                  setOpen(expanded ? null : row.commitmentId);
                } else {
                  moveFocus(event, index);
                }
              }}
            >
              <span className={cls("promised", "cell-date", lead)} role="cell">
                <strong>{formatDay(row.promised)}</strong>
                <small>T-{row.timeToImpactDays}d</small>
              </span>
              <span className={cls("commit", "cell-commit clickable", lead)} role="cell" onClick={() => onFocus(`${row.commitmentId}:order`)}>
                <strong>{row.commitmentId}</strong>
                <small>{row.customer}</small>
              </span>
              <span className={cls("product", "cell-product", lead)} role="cell">
                <strong>{row.product}</strong>
                <small>{row.family}</small>
              </span>
              <span className={cls("lens", "cell-lens", lead)} role="cell">
                {LENS_COLUMN[lens].render(row)}
              </span>
              <span className={cls("qty", "cell-qty", lead)} role="cell">
                <strong>{row.qty}</strong>
                <small>{row.uom}</small>
              </span>
              <span
                className={`${cls("constraint", "cell-constraint clickable", lead)}${focusTarget === constraintFocus ? " hot" : ""}`}
                role="cell"
                data-focus={constraintFocus}
                onClick={(event) => {
                  event.stopPropagation();
                  onFocus(constraintFocus);
                }}
                title="Focus the binding constraint and its composition"
              >
                <strong>{row.constraint.label}</strong>
              </span>
              <span className={cls("lifecycle", `state ${row.risk}`, lead)} role="cell">{RISK_LABEL[row.risk]}</span>
            </div>
            {expanded ? <LedgerDetail row={row} lens={lens} focusTarget={focusTarget} onFocus={onFocus} /> : null}
            <span className="sr">{RISK_LABEL[row.risk]}</span>
          </div>
        );
      })}
    </div>
  );
}

function LedgerDetail({
  row,
  lens,
  focusTarget,
  onFocus,
}: {
  row: LedgerRow;
  lens: RoleLens;
  focusTarget: string | null;
  onFocus: (key: string) => void;
}) {
  const persona = personaTier(row, lens);
  return (
    <div className="ledger-detail">
      <div className="tier persona">
        <p className="tier-kind">{persona.title}</p>
        <ul>
          {persona.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <div className="tier">
        <p className="tier-kind">Records · transaction · timestamped</p>
        {row.lanes.map((lane) => (
          <div key={lane.system} className="lane">
            <span className={lane.primary ? "lane-sys" : "lane-sys attached"}>
              {lane.system}
              {lane.primary ? "" : " (attached)"}
            </span>
            <ul>
              {lane.facts.map((fact) => {
                const key = `${row.commitmentId}:rec:${fact.recordId}`;
                return (
                  <li
                    key={fact.id}
                    id={key}
                    className={`${fact.freshness === "stale" ? "stale " : ""}clickable${focusTarget === key ? " hot" : ""}`}
                    onClick={() => onFocus(key)}
                  >
                    <span className="mono">{fact.recordId}</span> {fact.statement}
                    <small>
                      {fact.freshness === "stale" ? "◐ stale" : "● fresh"} · observed {fact.observedAt.slice(0, 16).replace("T", " ")}
                    </small>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="tier">
        <p className="tier-kind">Rules · master · versioned / effectivity</p>
        <ul>
          {row.rules.map((master) => (
            <li key={master.id}>
              <span className="mono">§ {master.label}</span> — {master.statement}
              <small>{validityLabel(master)}</small>
            </li>
          ))}
        </ul>
      </div>

      <div className="tier">
        <p className="tier-kind">Derived · ∑ · formula + trace</p>
        <ul>
          {row.derived.map((fact) => (
            <li key={fact.id}>
              <span className="mono">{fact.result}</span> — {fact.formula}
            </li>
          ))}
        </ul>
        <p className="ladder">
          {row.ladder.map((rung) => (
            <span key={rung.key}>
              {rung.label} {rung.value === null ? "—" : rung.value}
            </span>
          ))}
        </p>
      </div>

      {row.conflicts.length ? (
        <div className="tier conflict">
          <p className="tier-kind">Conflict · ⇄ · shown, not resolved</p>
          {row.conflicts.map((conflict) => (
            <p key={conflict.id}>
              <span className="mono">
                {conflict.sources.join(" ⇄ ")} → {conflict.statement}
              </span>{" "}
              <small>disposition: {conflict.disposition}</small>
            </p>
          ))}
        </div>
      ) : null}

      {row.missing.length ? (
        <div className="tier missing">
          <p className="tier-kind">Missing · ∅ · not established</p>
          {row.missing.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </div>
      ) : null}
    </div>
  );
}