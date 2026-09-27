import { useMemo, useState, type KeyboardEvent } from "react";
import { formatDay, type RoleLens } from "./model";
import { validityLabel } from "./master";
import {
  CONSTRAINT_GLYPH,
  LIFECYCLE_LABEL,
  capabilityLine,
  type LedgerRow,
} from "./ledger";

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
  coverage: ["lifecycle", "prov"],
  throughput: ["constraint", "feasible"],
  availability: ["constraint", "prov"],
  demand: ["product", "promised", "capable"],
};

type SortKey = "risk" | "promised" | "qty" | "lifecycle";

const COLUMNS: { key: string; label: string; sort?: SortKey }[] = [
  { key: "rail", label: "" },
  { key: "commit", label: "Order", sort: "promised" },
  { key: "product", label: "Product · Qty", sort: "qty" },
  { key: "promised", label: "Promise", sort: "promised" },
  { key: "capable", label: "Capable" },
  { key: "constraint", label: "Constraint" },
  { key: "feasible", label: "Feasible" },
  { key: "lifecycle", label: "State", sort: "lifecycle" },
  { key: "prov", label: "Provenance" },
];

function pct(part: number | null, whole: number | null): number | null {
  if (part === null || whole === null || whole <= 0) return null;
  return Math.max(0, Math.min(1, part / whole));
}

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
        {COLUMNS.map((column) => (
          <span
            key={column.key}
            role="columnheader"
            aria-sort={column.sort && sortKey === column.sort ? (sortDir === "asc" ? "ascending" : "descending") : undefined}
            className={cls(column.key, column.key === "rail" ? "rail" : column.sort ? "sortable" : "", lead)}
          >
            {column.sort ? (
              <button type="button" className="col-sort" onClick={() => onSort(column.sort!)}>
                {column.label}
                {sortKey === column.sort ? <em className="sort-mark">{sortDir === "asc" ? "▲" : "▼"}</em> : null}
              </button>
            ) : (
              column.label
            )}
          </span>
        ))}
      </div>
      {sorted.map((row, index) => {
        const expanded = open === row.commitmentId;
        const active = row.commitmentId === activeId;
        const coverage = pct(row.constraint.allocated, row.constraint.required);
        const constraintFocus = `${row.commitmentId}:constraint`;
        const provFocus = `${row.commitmentId}:prov`;
        const staleAged = row.lanes.some((lane) => lane.primary && lane.facts.some((fact) => fact.freshness === "stale"));
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
              <span className={`rail ${row.risk}`} role="cell" aria-hidden="true" />
              <span className={cls("commit", "cell-commit clickable", lead)} role="cell" onClick={() => onFocus(`${row.commitmentId}:order`)}>
                <strong>{row.commitmentId}</strong>
                <small>{row.customer}</small>
              </span>
              <span className={cls("product", "cell-product", lead)} role="cell">
                <strong>{row.product}</strong>
                <small>
                  {row.family} · {row.qty} {row.uom}
                </small>
              </span>
              <span className={cls("promised", "cell-date", lead)} role="cell">
                <strong>{formatDay(row.promised)}</strong>
                <small>T-{row.timeToImpactDays}d</small>
              </span>
              <span className={cls("capable", row.capableDeltaDays > 0 ? "cell-date late" : "cell-date", lead)} role="cell">
                <strong>{capabilityLine(row)}</strong>
                <small>{row.capableDeltaDays > 0 ? `${row.capableDeltaDays}d slip` : "on plan"}</small>
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
                <strong>
                  {CONSTRAINT_GLYPH[row.constraint.className]} {row.constraint.label}
                  {row.constraint.resource ? ` · ${row.constraint.resource}` : ""}
                  {row.constraint.secondaries.length ? `  +${row.constraint.secondaries.length}` : ""}
                </strong>
                {coverage !== null ? (
                  <small>
                    <span className="bar" aria-hidden="true">
                      <span style={{ width: `${Math.round(coverage * 100)}%` }} />
                    </span>
                    {row.constraint.allocated}/{row.constraint.required} {row.constraint.unit} · short{" "}
                    {row.constraint.shortfall}
                  </small>
                ) : (
                  <small>no binding constraint</small>
                )}
              </span>
              <span className={cls("feasible", row.feasibility === "infeasible" ? "state infeasible" : "state feasible", lead)} role="cell">
                {row.feasibility === "infeasible" ? "✗ infeasible" : "✓ feasible"}
              </span>
              <span className={cls("lifecycle", `state ${row.risk}`, lead)} role="cell">{LIFECYCLE_LABEL[row.lifecycle]}</span>
              <span
                className={`${cls("prov", "cell-prov clickable", lead)}${focusTarget === provFocus ? " hot" : ""}`}
                role="cell"
                data-focus={provFocus}
                onClick={(event) => {
                  event.stopPropagation();
                  onFocus(provFocus);
                }}
                title="Focus provenance and conflicts"
              >
                {row.lanes
                  .filter((lane) => lane.primary)
                  .map((lane) => (
                    <span key={lane.system} className={lane.facts.some((fact) => fact.freshness === "stale") ? "dot stale" : "dot"}>
                      ●{lane.system}
                    </span>
                  ))}
                {staleAged ? <span className="dot stale">◐{row.provenance.stale}</span> : null}
                {row.provenance.conflicts > 0 ? <span className="dot conflict">⚠{row.provenance.conflicts}</span> : null}
              </span>
            </div>
            {expanded ? <LedgerDetail row={row} focusTarget={focusTarget} onFocus={onFocus} /> : null}
            <span className="sr">{RISK_LABEL[row.risk]}</span>
          </div>
        );
      })}
    </div>
  );
}

function LedgerDetail({
  row,
  focusTarget,
  onFocus,
}: {
  row: LedgerRow;
  focusTarget: string | null;
  onFocus: (key: string) => void;
}) {
  return (
    <div className="ledger-detail">
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