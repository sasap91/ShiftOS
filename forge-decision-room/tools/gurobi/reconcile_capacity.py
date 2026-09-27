"""Reconcile erp/capacity_bucket.planned_minutes against the CURRENT operation schedule.

The contract's capacity_bucket flags 17 overloaded resource-weeks, but its
planned_minutes do not reconcile with the CURRENT operation schedule (it appears
front-loaded into P01–P08 and includes demand the plan does not carry). This
recomputes planned load from the CURRENT schedule and re-derives the bands.

    python3 tools/gurobi/reconcile_capacity.py

Writes tools/gurobi/out/capacity_reconciliation.json.
"""

from __future__ import annotations

import csv
import os
import sys
from collections import defaultdict
from datetime import date as _date

sys.path.insert(0, os.path.dirname(__file__))

from common import write_json

HERE = os.path.dirname(__file__)
FIX = os.path.join(HERE, "fixtures", "contract")
OUT = os.path.join(HERE, "out", "capacity_reconciliation.json")
P_START = "2026-09-28"
P_ANCHOR = _date(2026, 9, 28)  # Monday of P01
P_WEEKS = 26


def pweek_for(iso_day: str) -> str | None:
    """D-22: map any calendar date to its production week P01..P26 (anchored at P01 Monday)."""
    try:
        idx = (_date.fromisoformat(iso_day) - P_ANCHOR).days // 7 + 1
    except ValueError:
        return None
    return f"2026-P{idx:02d}" if 1 <= idx <= P_WEEKS else None


def rows(name: str) -> list[dict]:
    with open(os.path.join(FIX, name), encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def band(util: float) -> str:
    if util > 1.0:
        return "OVERLOADED"
    if util >= 0.9:
        return "WATCH"
    return "OK"


def main() -> None:
    cap = rows("capacity_bucket.csv")
    ship = rows("ship_calendar.csv")
    sched = {r["operation_schedule_id"]: r for r in rows("operation_schedule.csv")}
    dur = rows("operation_duration.csv")

    working = sorted(r["calendar_date"] for r in ship if r["is_working_day"] == "true" and r["calendar_date"] >= P_START)
    pweeks = sorted({r["calendar_week_id"] for r in cap})
    business_days = {}
    for r in cap:
        business_days[r["calendar_week_id"]] = int(r["business_days"])
    ranges: dict[str, set[str]] = {}
    cursor = 0
    for wk in pweeks:
        n = business_days[wk]
        ranges[wk] = set(working[cursor : cursor + n])
        cursor += n

    date_to_week = {}
    for wk, days in ranges.items():
        for d in days:
            date_to_week[d] = wk

    # Recompute planned minutes from CURRENT operations, bucketed by their planned date.
    # D-22: separate COMPLETED history (< plan start) from FORWARD load, so the
    # forward plan is reconciled against capacity without historical demand.
    current = defaultdict(float)
    historical = 0.0
    forward = 0.0
    forward_outside = 0.0
    for r in dur:
        s = sched.get(r["operation_schedule_id"], {})
        if s.get("schedule_state") != "CURRENT":
            continue
        m = float(r["duration_minutes"])
        planned = (s.get("planned_start_at", "") or "")[:10]
        if planned and planned < P_START:
            historical += m
            continue
        forward += m
        wk = date_to_week.get(planned) or pweek_for(planned)
        if wk:
            current[(r["resource_id"], wk)] += m
        else:
            forward_outside += m

    cap_by = {(r["resource_id"], r["calendar_week_id"]): r for r in cap}
    contract_over = sum(1 for r in cap if r["overload_flag"] == "true")
    rec_over, rows_out = 0, []
    for (rid, wk), r in sorted(cap_by.items()):
        capacity = float(r["capacity_minutes"])
        planned_current = current.get((rid, wk), 0.0)
        util = planned_current / capacity if capacity else 0.0
        if util > 1.0:
            rec_over += 1
        rows_out.append(
            {
                "resourceId": rid,
                "week": wk,
                "capacityMinutes": round(capacity, 1),
                "contractPlannedMinutes": float(r["planned_minutes"]),
                "recomputedPlannedMinutes": round(planned_current, 1),
                "recomputedUtilisation": round(util, 3),
                "recomputedBand": band(util),
            }
        )

    # B-14/D-20: an overload is recoverable when the resource can run overtime or
    # add a third shift (the leak-test recovery in the hero scenario is this case).
    overloads = [r for r in rows_out if r["recomputedUtilisation"] > 1.0]
    recoverable, unresolved = [], []
    for r in overloads:
        bucket = cap_by[(r["resourceId"], r["week"])]
        overage = r["recomputedPlannedMinutes"] - r["capacityMinutes"]
        ot = float(bucket.get("overtime_minutes_per_day") or 0)
        regular = float(bucket.get("regular_minutes_per_day") or 0)
        days = float(bucket.get("business_days") or 0)
        overtime_capacity = ot * days
        third_shift_capacity = (regular / 2.0) * days  # one added 8h shift/day
        if overage <= overtime_capacity + third_shift_capacity:
            recoverable.append(
                {
                    **r,
                    "overageMinutes": round(overage, 1),
                    "recovery": "overtime" if overage <= overtime_capacity else "third-shift",
                    "governed": True,
                }
            )
        else:
            unresolved.append(r)

    result = {
        "source": "COOLIT_Synthetic_Enterprise_Data_v3.2",
        "scope": "CURRENT operation schedule vs erp/capacity_bucket",
        "contractOverloadedWeeks": contract_over,
        "recomputedOverloadedWeeks": rec_over,
        # D-22 split: history is completed work, not forward load.
        "currentDemandHistoricalMinutes": round(historical, 1),
        "currentDemandForwardMinutes": round(forward, 1),
        "currentDemandForwardUnmappedMinutes": round(forward_outside, 1),
        "currentDemandOutsideHorizonMinutes": round(forward_outside, 1),
        "forwardOverloads": len(overloads),
        "forwardOverloadsRecoverable": len(recoverable),
        "forwardOverloadsUnresolved": len(unresolved),
        "recoverableOverloads": recoverable,
        "weeks": rows_out,
    }
    write_json(OUT, result)

    print("capacity reconciliation — CURRENT schedule vs capacity_bucket")
    print(f"  contract overloaded resource-weeks : {contract_over}")
    print(f"  recomputed (CURRENT forward) overloaded : {rec_over}  (recoverable {len(recoverable)} / unresolved {len(unresolved)})")
    print(f"  CURRENT demand: historical {historical:,.0f} min · forward {forward:,.0f} min")
    print(f"  forward demand unmapped to a P-week    : {forward_outside:,.0f} min")
    print(f"  {'resource':16s} {'week':9s} {'cap':>8s} {'contract':>9s} {'current':>9s} {'util':>6s}")
    worst = sorted(rows_out, key=lambda r: -r["recomputedUtilisation"])[:10]
    for r in worst:
        print(f"  {r['resourceId']:16s} {r['week']:9s} {r['capacityMinutes']:8.0f} {r['contractPlannedMinutes']:9.0f} {r['recomputedPlannedMinutes']:9.0f} {r['recomputedUtilisation']:6.2f}")
    print(f"wrote {os.path.relpath(OUT, os.path.dirname(os.path.dirname(HERE)))}")


if __name__ == "__main__":
    main()