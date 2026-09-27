/**
 * Left SCOPE rail (V-05): search + zone chip + RISK/PRODUCT/FLOW/OWNER/HORIZON
 * filters + queue count. Presentation only — the App owns filter state and the
 * filter engine (V-06) applies it to the queue and the order table.
 */
import { HORIZONS, FLOW_STAGES, type FlowStage, type Horizon } from "../../zones";

export type Filters = {
  risk: string[];
  product: string[];
  flow: FlowStage[];
  owner: string[];
  horizon: Horizon;
  query: string;
};

export const DEFAULT_FILTERS: Filters = { risk: [], product: [], flow: [], owner: [], horizon: 13, query: "" };

const RISKS: [string, string][] = [
  ["at-risk", "At risk"],
  ["awaiting", "Blocked"],
  ["monitoring", "Watch"],
  ["approved", "On track"],
];
const PRODUCTS: [string, string][] = [
  ["Cold-plate loop", "Cold plate"],
  ["Rack manifold", "Manifold"],
  ["CDU", "CDU"],
];
const OWNERS = ["Operations", "Planning", "Procurement", "Quality", "Engineering", "Sales operations"];

function Group<T extends string>({ title, values, selected, label, onToggle }: {
  title: string;
  values: readonly T[];
  selected: readonly T[];
  label?: (value: T) => string;
  onToggle: (value: T) => void;
}) {
  return (
    <section className="rail-group">
      <h3>{title}</h3>
      <div className="rail-chips">
        {values.map((value) => (
          <button
            key={value}
            type="button"
            className={selected.includes(value) ? "chip on" : "chip"}
            aria-pressed={selected.includes(value)}
            onClick={() => onToggle(value)}
          >
            {label ? label(value) : value}
          </button>
        ))}
      </div>
    </section>
  );
}

export function FilterRail({ filters, count, selectedZone, zoneLabel, activeCount, onChange, onClearZone, onClearAll }: {
  filters: Filters;
  count: number;
  selectedZone: string | null;
  zoneLabel: string | undefined;
  activeCount: number;
  onChange: (next: Filters) => void;
  onClearZone: () => void;
  onClearAll: () => void;
}) {
  const toggle = <K extends "risk" | "product" | "flow" | "owner">(key: K, value: Filters[K][number]) =>
    onChange({
      ...filters,
      [key]: (filters[key] as string[]).includes(value)
        ? (filters[key] as string[]).filter((item) => item !== value)
        : [...(filters[key] as string[]), value],
    } as Filters);

  return (
    <div className="filter-rail">
      <header className="rail-head">
        <h2>Scope</h2>
        <button type="button" className="rail-clear" onClick={onClearAll} disabled={!activeCount}>
          Clear {activeCount || ""}
        </button>
      </header>

      <label className="rail-search">
        <span className="sr">Search orders</span>
        <input
          value={filters.query}
          onChange={(event) => onChange({ ...filters, query: event.target.value })}
          placeholder="Search orders…"
        />
      </label>

      {selectedZone ? (
        <button type="button" className="zone-chip" onClick={onClearZone}>
          Zone: {selectedZone}
          {zoneLabel ? ` · ${zoneLabel}` : ""} <span aria-hidden="true">×</span>
        </button>
      ) : null}

      <Group title="Risk" values={RISKS.map(([value]) => value)} selected={filters.risk} label={(value) => RISKS.find(([id]) => id === value)?.[1] ?? value} onToggle={(value) => toggle("risk", value)} />

      <details className="rail-more">
        <summary>Filters{activeCount ? ` · ${activeCount}` : ""}</summary>
        <Group title="Product" values={PRODUCTS.map(([value]) => value)} selected={filters.product} label={(value) => PRODUCTS.find(([id]) => id === value)?.[1] ?? value} onToggle={(value) => toggle("product", value)} />
        <Group title="Flow" values={FLOW_STAGES} selected={filters.flow} onToggle={(value) => toggle("flow", value)} />
        <Group title="Owner" values={OWNERS} selected={filters.owner} onToggle={(value) => toggle("owner", value)} />
      </details>

      <section className="rail-group">
        <h3>Horizon</h3>
        <select
          value={filters.horizon}
          onChange={(event) => onChange({ ...filters, horizon: Number(event.target.value) as Horizon })}
          aria-label="Planning horizon"
        >
          {HORIZONS.map((weeks) => (
            <option key={weeks} value={weeks}>
              {weeks} weeks
            </option>
          ))}
        </select>
      </section>

      <p className="rail-count">
        Orders <strong>{count}</strong>
      </p>
    </div>
  );
}
