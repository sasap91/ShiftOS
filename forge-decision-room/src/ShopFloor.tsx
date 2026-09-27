/**
 * COOLIT shop floor (V-02/V-03/V-04).
 *
 * Front-dash centre-top. Prefers the authoritative floor-plan illustration at
 * `public/floor-plan.png` (PT-02) with clickable zone hotspots; falls back to a
 * schematic SVG until the asset is dropped in. Overlays: open-decision badge,
 * selection highlight, hover preview. Selecting a zone filters the queue +
 * table and re-scopes the right pane.
 *
 * It renders from the same ledger the table shows — the floor never holds a
 * fact the table cannot show.
 */
import { useEffect, useState } from "react";
import type { LedgerRow } from "./ledger";
import { PLAN, ZONES, zoneLoad, zonesForRow, type Zone } from "./zones";

const DOT: Record<string, string> = {
  "at-risk": "#b3261e",
  awaiting: "#b7791f",
  approved: "#2f7d32",
  monitoring: "#3a6ea5",
};

const FLOOR_IMAGE = "/floor-plan.png";

function lines(label: string, width: number): string[] {
  const max = Math.max(8, Math.floor(width / 6));
  const words = label.split(" ");
  const out: string[] = [];
  let line = "";
  for (const word of words) {
    if ((line + " " + word).trim().length > max && line) {
      out.push(line);
      line = word;
    } else {
      line = (line + " " + word).trim();
    }
  }
  if (line) out.push(line);
  return out.slice(0, 3);
}

function Arrow({ x1, y1, x2, y2, dashed }: { x1: number; y1: number; x2: number; y2: number; dashed?: boolean }) {
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={dashed ? "#b7791f" : "#5b6675"}
      strokeWidth={1.4}
      strokeDasharray={dashed ? "5 4" : undefined}
      markerEnd="url(#arrow)"
    />
  );
}

function Schematic({ load, bound, selectedZone, onSelectZone }: {
  load: Map<string, { count: number; worst: LedgerRow["risk"] | null }>;
  bound: Set<string>;
  selectedZone: string | null;
  onSelectZone: (id: string | null) => void;
}) {
  const empty = (id: string) => load.get(id) ?? { count: 0, worst: null };
  return (
    <svg className="floor" viewBox={`0 0 ${PLAN.width} ${PLAN.height}`} role="img" aria-label="COOLIT shop floor plan" preserveAspectRatio="xMidYMid meet">
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill="#5b6675" />
        </marker>
      </defs>
      <rect x={0} y={0} width={PLAN.width} height={PLAN.height} className="floor-bg" />
      <text x={PLAN.width / 2} y={16} className="floor-aisle">PEDESTRIAN WALKWAY (KEEP CLEAR)</text>
      <text x={PLAN.width / 2} y={610} className="floor-aisle">MATERIAL HANDLING LANE (FORKLIFTS / CARTS)</text>
      <text x={PLAN.width / 2} y={666} className="floor-aisle">PEDESTRIAN WALKWAY (KEEP CLEAR)</text>
      <rect x={1136} y={36} width={92} height={46} rx={3} className="floor-util" />
      <text x={1182} y={63} className="floor-util-label">UTILITIES</text>
      {ZONES.map((zone) => {
        const { count, worst } = empty(zone.id);
        const cx = zone.x + zone.w / 2;
        const body = lines(zone.label, zone.w);
        return (
          <g
            key={zone.id}
            className={["zone", selectedZone === zone.id ? "selected" : "", bound.has(zone.id) ? "bound" : ""].filter(Boolean).join(" ")}
            role="button"
            tabIndex={0}
            aria-label={`${zone.label}${count ? `, ${count} open decisions` : ""}`}
            onClick={() => onSelectZone(selectedZone === zone.id ? null : zone.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelectZone(selectedZone === zone.id ? null : zone.id);
              }
            }}
          >
            <title>{`${zone.id} · ${zone.label} — ${zone.role}${count ? ` · ${count} open` : ""}`}</title>
            <rect x={zone.x} y={zone.y} width={zone.w} height={zone.h} rx={3} className="zone-rect" />
            <text x={cx} y={zone.y + 14} className="zone-id">{zone.id}</text>
            {body.map((line, index) => (
              <text key={line} x={cx} y={zone.y + 28 + index * 11} className="zone-label">{line}</text>
            ))}
            <circle cx={zone.x + 10} cy={zone.y + zone.h - 12} r={3.4} fill={worst ? DOT[worst] : "#9aa4b2"} />
            {count > 0 ? (
              <g>
                <circle cx={zone.x + zone.w - 12} cy={zone.y + 12} r={8.5} className="zone-badge" />
                <text x={zone.x + zone.w - 12} y={zone.y + 15.5} className="zone-badge-text">{count}</text>
              </g>
            ) : null}
          </g>
        );
      })}
      <Arrow x1={250} y1={244} x2={265} y2={244} />
      <Arrow x1={430} y1={160} x2={448} y2={160} />
      <Arrow x1={430} y1={272} x2={448} y2={272} />
      <Arrow x1={430} y1={378} x2={448} y2={378} />
      <Arrow x1={888} y1={272} x2={905} y2={272} />
      <Arrow x1={1032} y1={272} x2={1045} y2={272} />
      <Arrow x1={1162} y1={272} x2={1175} y2={272} />
      <Arrow x1={1300} y1={272} x2={1318} y2={272} />
      <Arrow x1={1422} y1={272} x2={1435} y2={272} />
      <Arrow x1={1498} y1={430} x2={1498} y2={478} />
      <Arrow x1={420} y1={552} x2={690} y2={552} dashed />
      <Arrow x1={826} y1={478} x2={826} y2={430} dashed />
      <text x={836} y={600} textAnchor="middle" className="floor-flow-note">CONTROLLED REWORK FLOW (AS NEEDED)</text>
    </svg>
  );
}

/** Authoritative illustration + clickable zone hotspots (used when the asset exists). */
function Illustration({ load, bound, selectedZone, onSelectZone }: {
  load: Map<string, { count: number; worst: LedgerRow["risk"] | null }>;
  bound: Set<string>;
  selectedZone: string | null;
  onSelectZone: (id: string | null) => void;
}) {
  return (
    <div className="floor-wrap">
      <img className="floor-img" src={FLOOR_IMAGE} alt="COOLIT shop floor plan" />
      {ZONES.map((zone: Zone) => {
        const { count, worst } = load.get(zone.id) ?? { count: 0, worst: null };
        return (
          <button
            key={zone.id}
            type="button"
            className={["zone-hotspot", selectedZone === zone.id ? "selected" : "", bound.has(zone.id) ? "bound" : ""].filter(Boolean).join(" ")}
            style={{
              left: `${(zone.x / PLAN.width) * 100}%`,
              top: `${(zone.y / PLAN.height) * 100}%`,
              width: `${(zone.w / PLAN.width) * 100}%`,
              height: `${(zone.h / PLAN.height) * 100}%`,
            }}
            title={`${zone.id} · ${zone.label} — ${zone.role}${count ? ` · ${count} open` : ""}`}
            aria-label={`${zone.label}${count ? `, ${count} open decisions` : ""}`}
            onClick={() => onSelectZone(selectedZone === zone.id ? null : zone.id)}
          >
            {count > 0 ? <span className="zone-hotspot-badge">{count}</span> : null}
            {worst ? <span className="zone-hotspot-dot" style={{ background: DOT[worst] }} /> : null}
          </button>
        );
      })}
    </div>
  );
}

export function ShopFloor({ rows, activeId, selectedZone, onSelectZone }: {
  rows: LedgerRow[];
  activeId?: string;
  selectedZone: string | null;
  onSelectZone: (id: string | null) => void;
}) {
  const load = zoneLoad(rows);
  const activeRow = activeId ? rows.find((row) => row.commitmentId === activeId) : undefined;
  const bound = new Set(activeRow ? zonesForRow(activeRow) : []);
  const [hasImage, setHasImage] = useState(false);

  useEffect(() => {
    const probe = new Image();
    probe.onload = () => setHasImage(true);
    probe.onerror = () => setHasImage(false);
    probe.src = FLOOR_IMAGE;
  }, []);

  return hasImage ? (
    <Illustration load={load} bound={bound} selectedZone={selectedZone} onSelectZone={onSelectZone} />
  ) : (
    <Schematic load={load} bound={bound} selectedZone={selectedZone} onSelectZone={onSelectZone} />
  );
}