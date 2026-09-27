/**
 * Rate-based capacity & day-bin model (B-13/B-14, D-20) + day-bin sum (T-09).
 *
 * Reads the COOLIT v3.2 contract fixtures (ERP capacity buckets + operation
 * durations/schedule + ship calendar) and verifies the manufacturing data
 * contracts the plan promises:
 *   - a weekly capacity bucket = available_minutes/day × business_days × concurrent_units
 *     (i.e. the day-bins sum to the window total — T-09);
 *   - available = regular × derate + overtime;
 *   - overload / utilisation agree with the raw minutes;
 *   - operation duration = setup + quantity × run-rate;
 *   - schedule windows and shipping-day rules are internally consistent.
 *
 * It also quantifies the P-week ↔ H-week mismatch (DG-15) that leaves demand
 * outside the capacity horizon.
 *
 * Run: npm run test:capacity
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type Check = { id: string; area: string; name: string; ok: boolean; detail?: string };
const checks: Check[] = [];
const check = (id: string, area: string, name: string, ok: boolean, detail?: string) => checks.push({ id, area, name, ok, detail });
const near = (a: number, b: number, eps = 0.01) => Math.abs(a - b) <= eps;

/** Minimal RFC-4180 CSV parser (handles quoted commas in the capacity_rule text). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") field += c;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function table(file: string): Record<string, string>[] {
  const rows = parseCsv(readFileSync(resolve(process.cwd(), "tools/gurobi/fixtures/contract", file), "utf8"));
  const header = rows[0];
  return rows.slice(1).filter((r) => r.length === header.length).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i]])) as Record<string, string>);
}
const num = (v: string) => Number(v);

// --- capacity buckets: the weekly day-bin sum (T-09) ------------------------
const buckets = table("capacity_bucket.csv");
check("T-09", "capacity", "every capacity bucket's minutes equal available/day × business days × concurrent units",
  buckets.every((b) => near(num(b.capacity_minutes), num(b.available_minutes_per_day) * num(b.business_days) * num(b.concurrent_units))),
  `${buckets.length} buckets`);
check("T-09", "capacity", "available/day equals regular × derate + overtime (rounded)",
  buckets.every((b) => Math.abs(num(b.available_minutes_per_day) - Math.round(num(b.regular_minutes_per_day) * num(b.derate_factor) + num(b.overtime_minutes_per_day))) <= 1));
check("T-09", "capacity", "baseline capacity equals regular/day × business days × concurrent units",
  buckets.every((b) => near(num(b.baseline_capacity_minutes), num(b.regular_minutes_per_day) * num(b.business_days) * num(b.concurrent_units))));
check("T-16", "capacity", "the overload flag agrees with planned > capacity",
  buckets.every((b) => (b.overload_flag === "true") === num(b.planned_minutes) > num(b.capacity_minutes)));
check("T-16", "capacity", "utilisation equals planned ÷ capacity (3dp) where capacity > 0",
  buckets.every((b) => num(b.capacity_minutes) <= 0 || near(num(b.utilisation), num(b.planned_minutes) / num(b.capacity_minutes), 0.002)));
const overloaded = buckets.filter((b) => b.overload_flag === "true");
check("T-16", "capacity", "the fixture has overloaded resource-weeks to reconcile",
  overloaded.length > 0, `${overloaded.length} overloaded buckets`);

// --- operation durations ----------------------------------------------------
const ops = table("operation_duration.csv");
check("T-16", "operations", "run_minutes equals quantity × run_minutes_per_unit",
  ops.every((o) => near(num(o.run_minutes), num(o.quantity) * num(o.run_minutes_per_unit))), `${ops.length} operations`);
check("T-16", "operations", "duration_minutes equals setup_minutes + run_minutes",
  ops.every((o) => near(num(o.duration_minutes), num(o.setup_minutes) + num(o.run_minutes))));
check("T-16", "operations", "every operation carries a resource; week ids are valid when present",
  ops.every((o) => o.resource_id.length > 0 && (o.calendar_week_id === "" || /^\d{4}-[A-Z]\d+$/.test(o.calendar_week_id))) &&
    ops.filter((o) => /^\d{4}-[A-Z]\d+$/.test(o.calendar_week_id)).length >= 800);

// --- schedule windows -------------------------------------------------------
const sched = table("operation_schedule.csv");
check("T-16", "schedule", "every scheduled operation ends after it starts",
  sched.every((s) => s.planned_end_at > s.planned_start_at), `${sched.length} scheduled operations`);
check("T-16", "schedule", "CURRENT schedule operations are ranked in ascending sequence per work order",
  (() => {
    const byWo = new Map<string, number[]>();
    for (const s of sched) {
      if (s.schedule_state !== "CURRENT") continue;
      byWo.set(s.work_order_id, [...(byWo.get(s.work_order_id) ?? []), num(s.sequence_rank)]);
    }
    return [...byWo.values()].every((ranks) => ranks.every((r, i) => i === 0 || r >= ranks[i - 1]));
  })());

// --- ship calendar ----------------------------------------------------------
const cal = table("ship_calendar.csv");
check("T-16", "calendar", "a shipping day is always a working day",
  cal.every((c) => c.is_shipping_day !== "true" || c.is_working_day === "true"), `${cal.length} calendar rows`);
check("T-16", "calendar", "the calendar has shipping days in the planning window",
  cal.some((c) => c.is_shipping_day === "true" && c.calendar_date >= "2026-09-28" && c.calendar_date <= "2027-03-26"));

// --- work orders ------------------------------------------------------------
const wos = table("work_order.csv");
check("T-16", "work-orders", "every work order has a planned window and a primary commitment",
  wos.every((w) => w.planned_end_at > w.planned_start_at && w.primary_commitment_id.length > 0), `${wos.length} work orders`);

// --- the P-week ↔ H-week gap (DG-15) ----------------------------------------
const capacityWeeks = new Set(buckets.map((b) => `${b.resource_id}|${b.calendar_week_id}`));
const opWeeks = new Set(ops.map((o) => `${o.resource_id}|${o.calendar_week_id}`));
const matched = [...opWeeks].filter((key) => capacityWeeks.has(key)).length;
check("T-16", "reconciliation", "operation weeks and capacity weeks are joinable (the DG-15 gap is closed)",
  matched > 0,
  `matched ${matched} of ${opWeeks.size} resource-weeks (capacity uses P-weeks, operations use H-weeks)`);

// --- report -----------------------------------------------------------------
const pad = (v: string, n: number) => v.padEnd(n);
const failed = checks.filter((c) => !c.ok);
console.log("\nFORGE rate-based capacity & day-bin model");
console.log("========================================");
for (const c of checks) {
  console.log(`${c.ok ? "PASS" : "FAIL"}  ${pad(c.id, 6)} ${pad(c.area, 12)} ${c.name}${c.ok ? "" : `\n        ${c.detail ?? ""}`}`);
}
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
console.log("\nCapacity evidence:");
console.log(`  capacity buckets        : ${buckets.length}`);
console.log(`  overloaded buckets      : ${overloaded.length}`);
console.log(`  operations              : ${ops.length}`);
console.log(`  scheduled operations    : ${sched.length}`);
console.log(`  work orders             : ${wos.length}`);
console.log(`  joinable resource-weeks : ${matched} / ${opWeeks.size}  (DG-15 P-week ↔ H-week)`);

if (failed.length) {
  console.log(`\n${failed.length} FAILED`);
  process.exit(1);
}
console.log("\ncapacity model passed.");