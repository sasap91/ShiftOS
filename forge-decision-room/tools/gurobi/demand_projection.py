"""Demand projection: requested -> promised -> capable per commitment.

Joins governed/canonical_commitment (requested/promised dates + priority),
erp/work_order (commitment -> work order), and the contract schedule's
completion day (capable). Emits the three deltas the demand planner acts on.

    python3 tools/gurobi/demand_projection.py

Writes tools/gurobi/out/demand_projection.json.
"""

from __future__ import annotations

import csv
import datetime
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from common import write_json

HERE = os.path.dirname(__file__)
FIX = os.path.join(HERE, "fixtures", "contract")
SCHEDULE = os.path.join(HERE, "out", "contract_schedule.json")
OUT = os.path.join(HERE, "out", "demand_projection.json")


def rows(name: str) -> list[dict]:
    with open(os.path.join(FIX, name), encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def day(iso: str | None) -> int | None:
    if not iso:
        return None
    try:
        return datetime.date.fromisoformat(iso[:10]).toordinal()
    except ValueError:
        return None


def days_between(a: str | None, b: str | None) -> int | None:
    da, db = day(a), day(b)
    return None if da is None or db is None else db - da


def main() -> None:
    commit = rows("canonical_commitment.csv")
    wo = rows("work_order.csv")
    active = {"FIRM_ORDER", "APPROVED_COMMITMENT", "PLANNED", "RESERVATION"}

    wo_by_commitment = {}
    for r in wo:
        cid = r.get("primary_commitment_id")
        if cid:
            wo_by_commitment.setdefault(cid, []).append(r["work_order_id"])

    capable = {}
    if os.path.exists(SCHEDULE):
        plan = json.load(open(SCHEDULE, encoding="utf-8"))["plan"]["jobs"]
        for job in plan:
            capable[job["id"]] = job.get("completionDay")

    out = []
    for r in commit:
        cid = r["commitment_id"]
        requested = r.get("requested_date") or None
        promised = r.get("approved_commit_date") or r.get("erp_schedule_date") or None
        wos = wo_by_commitment.get(cid, [])
        cap_days = [capable[w] for w in wos if capable.get(w)]
        cap = max(cap_days) if cap_days else None  # full commitment ships when the last WO completes
        out.append(
            {
                "commitmentId": cid,
                "priority": r.get("priority_class"),
                "status": r.get("commitment_status"),
                "requestedDate": requested,
                "promisedDate": promised,
                "capableDate": cap,
                "workOrders": wos,
                "requestToPromiseDays": days_between(requested, promised),
                "promiseToCapableDays": days_between(promised, cap),
                "capableToRequestedDays": days_between(requested, cap),
                "active": r.get("commitment_status") in active,
            }
        )

    scored = [row for row in out if row["capableToRequestedDays"] is not None]
    scored.sort(key=lambda r: (r["capableToRequestedDays"], r["priority"] or "P9", r["commitmentId"]))
    unlinked = [row for row in out if not row["workOrders"]]
    # D-24: a completed commitment without a work order is history, not a gap.
    historical_statuses = {"DELIVERED", "SHIPPED", "CANCELLED", "CLOSED"}
    active_unlinked = [row for row in unlinked if row["active"] and row["status"] not in historical_statuses]
    historical_unlinked = [row for row in unlinked if row not in active_unlinked]
    active_rows = [row for row in scored if row["active"]]

    result = {
        "source": "COOLIT_Synthetic_Enterprise_Data_v3.2",
        "commitments": len(out),
        "linkedToWorkOrder": sum(1 for row in out if row["workOrders"]),
        "activeCommitments": sum(1 for row in out if row["active"]),
        "unlinked": len(unlinked),
        "activeUnlinked": len(active_unlinked),
        "historicalUnlinked": len(historical_unlinked),
        "mostAtRisk": scored[:12],
        "projection": out,
    }
    write_json(OUT, result)

    print(f"demand projection  commitments {len(out)}  linked-to-WO {result['linkedToWorkOrder']}  active {result['activeCommitments']}")
    print(f"  unlinked commitments: {len(unlinked)} (active {len(active_unlinked)} / historical {len(historical_unlinked)})")
    print(f"\n  {'commitment':12s} {'pri':4s} {'status':20s} {'requested':11s} {'promised':11s} {'capable':11s} {'req->pro':>8s} {'pro->cap':>8s} {'req->cap':>8s}")
    for r in active_rows[:15]:
        print(
            f"  {r['commitmentId']:12s} {r['priority'] or '-':4s} {r['status'] or '-':20s} "
            f"{r['requestedDate'] or '-':11s} {r['promisedDate'] or '-':11s} {r['capableDate'] or '-':11s} "
            f"{str(r['requestToPromiseDays']):>8s} {str(r['promiseToCapableDays']):>8s} {str(r['capableToRequestedDays']):>8s}"
        )
    print(f"\nwrote {os.path.relpath(OUT, os.path.dirname(os.path.dirname(HERE)))}")


if __name__ == "__main__":
    main()