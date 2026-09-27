"""Contract-driven production planning run (Data→Model contract v3.2).

Consumes the embedded contract tables directly — no invented rates:

  erp/operation_duration   duration_minutes = setup_minutes + quantity × run_minutes_per_unit
  erp/capacity_bucket      capacity_minutes = available_minutes_per_day × business_days × concurrent_units
  reference/priority_policy  numeric weight + ordering key
  reference/ship_calendar    working days
  erp/work_order + governed/canonical_commitment  jobs and due dates

Capacity is **rate-based and cumulative** (a resource has minutes/day; operations
consume them and may share a day). The run reports a feasibility pre-check
(AL-16) and a deterministic dispatch schedule (AL-01).

    python3 tools/gurobi/schedule_contract.py [--verbose]

Writes tools/gurobi/out/contract_schedule.json.
"""

from __future__ import annotations

import argparse
import csv
import os
import sys
from collections import defaultdict

sys.path.insert(0, os.path.dirname(__file__))

from common import sha256_of, solver_signature, write_json

HERE = os.path.dirname(__file__)
FIX = os.path.join(HERE, "fixtures", "contract")
OUT = os.path.join(HERE, "out", "contract_schedule.json")
HORIZON_START = "2026-09-28"


def rows(name: str) -> list[dict]:
    with open(os.path.join(FIX, name), encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def build(forward_only: bool = False, include_superseded: bool = False) -> dict:
    op_dur = rows("operation_duration.csv")
    op_sched = {r["operation_schedule_id"]: r for r in rows("operation_schedule.csv")}
    cap = rows("capacity_bucket.csv")
    wo = rows("work_order.csv")
    prio = rows("priority_policy.csv")
    ship = rows("ship_calendar.csv")
    commit = rows("canonical_commitment.csv")

    weight = {r["priority_class"]: float(r["weight"]) for r in prio}
    rank = {r["priority_class"]: int(r["sort_rank"]) for r in prio}
    need = {}
    for r in commit:
        due = r.get("approved_commit_date") or r.get("erp_schedule_date") or r.get("requested_date")
        if r.get("commitment_id") and due:
            need[r["commitment_id"]] = due[:10]

    working_days = sorted(r["calendar_date"] for r in ship if r["is_working_day"] == "true" and r["calendar_date"] >= HORIZON_START)

    # Capacity weeks (P01..) -> consecutive working days; daily capacity in minutes.
    pweeks = sorted({r["calendar_week_id"] for r in cap})
    cap_by = {(r["resource_id"], r["calendar_week_id"]): r for r in cap}
    week_days: dict[str, list[str]] = {}
    cursor = 0
    for wk in pweeks:
        template = next(r for r in cap if r["calendar_week_id"] == wk)
        n = int(template["business_days"])
        week_days[wk] = working_days[cursor : cursor + n]
        cursor += n
    horizon = working_days[:cursor]
    day_index = {d: i for i, d in enumerate(horizon)}

    daily_cap: dict[tuple[str, int], float] = {}
    for (rid, wk), r in cap_by.items():
        per_day = float(r["available_minutes_per_day"]) * float(r["concurrent_units"])
        for d in week_days[wk]:
            daily_cap[(rid, day_index[d])] = per_day

    # Jobs.
    jobs = {}
    for r in wo:
        wid = r["work_order_id"]
        pid = r["primary_commitment_id"]
        due = need.get(pid) or (r.get("planned_end_at", "") or "")[:10]
        jobs[wid] = {
            "id": wid,
            "product": r["configuration_id"],
            "qty": int(r["order_quantity"]),
            "priority": r["priority"],
            "rank": rank.get(r["priority"], 9),
            "weight": weight.get(r["priority"], 1.0),
            "due": due,
            "commitment": pid,
        }

    # Operations grouped by work order — forward horizon only (plan dates >= horizon start).
    ops_by_wo: dict[str, list[dict]] = defaultdict(list)
    for r in op_dur:
        sched = op_sched.get(r["operation_schedule_id"], {})
        if not include_superseded and sched.get("schedule_state") != "CURRENT":
            continue  # only the active schedule version is in scope
        planned = (sched.get("planned_start_at", "") or "")[:10]
        if forward_only and planned and planned < HORIZON_START:
            continue  # historical operation, not part of the forward schedule
        ops_by_wo[r["work_order_id"]].append(
            {
                "seq": int(r["operation_sequence"]),
                "resourceId": r["resource_id"],
                "minutes": float(r["duration_minutes"]),
            }
        )
    for wid in ops_by_wo:
        ops_by_wo[wid].sort(key=lambda o: o["seq"])
    jobs = {wid: job for wid, job in jobs.items() if ops_by_wo.get(wid)}

    return {
        "weight": weight,
        "horizon": horizon,
        "day_index": day_index,
        "daily_cap": daily_cap,
        "cap_rows": cap,
        "jobs": jobs,
        "ops_by_wo": ops_by_wo,
    }


def feasibility(bundle: dict) -> dict:
    horizon = bundle["horizon"]
    demand = defaultdict(float)
    for ops in bundle["ops_by_wo"].values():
        for op in ops:
            demand[op["resourceId"]] += op["minutes"]
    capacity = defaultdict(float)
    for r in bundle["cap_rows"]:
        capacity[r["resource_id"]] += float(r["capacity_minutes"])
    resources = {}
    for rid in sorted(set(demand) | set(capacity)):
        d, c = demand[rid], capacity[rid]
        resources[rid] = {
            "demandMinutes": round(d, 1),
            "capacityMinutes": round(c, 1),
            "utilisation": round(d / c, 3) if c else None,
            "overloadedWeeks": sorted(
                r["calendar_week_id"] for r in bundle["cap_rows"] if r["resource_id"] == rid and r["overload_flag"] == "true"
            ),
        }
    overloaded = [
        {"resourceId": r["resource_id"], "week": r["calendar_week_id"], "utilisation": float(r["utilisation"]), "band": r["utilisation_band"]}
        for r in bundle["cap_rows"]
        if r["overload_flag"] == "true"
    ]
    return {
        "horizonDays": len(horizon),
        "overloadedWeeks": overloaded,
        "resources": resources,
        "feasibleWithinHorizon": all(v["utilisation"] is None or v["utilisation"] <= 1.0 for v in resources.values()) and not overloaded,
    }


def schedule(bundle: dict) -> dict:
    """Rate-based cumulative dispatch: operations consume minutes from a resource's daily capacity."""
    horizon = bundle["horizon"]
    H = len(horizon)
    day_index = bundle["day_index"]
    remaining = dict(bundle["daily_cap"])  # minutes left per (resource, day)

    # Ready-op greedy in (priority rank, due, wo id, sequence) order.
    state = {wid: {"idx": 0, "ready": 0} for wid in bundle["ops_by_wo"]}
    out_ops: dict[str, list[dict]] = defaultdict(list)
    completion: dict[str, int] = {}
    total = sum(len(o) for o in bundle["ops_by_wo"].values())
    placed = 0

    while placed < total:
        best = None
        for wid, ops in bundle["ops_by_wo"].items():
            st = state[wid]
            if st["idx"] >= len(ops):
                continue
            job = bundle["jobs"][wid]
            due_idx = day_index.get(job["due"], H)
            key = (job["rank"], due_idx, wid, st["idx"])
            if best is None or key < best[0]:
                best = (key, wid, ops[st["idx"]])
        _, wid, op = best
        st = state[wid]

        need = op["minutes"]
        start = st["ready"]
        day = start
        first = None
        last = start
        while need > 1e-9 and day < H:
            avail = remaining.get((op["resourceId"], day), 0.0)
            if avail > 1e-9:
                use = min(need, avail)
                remaining[(op["resourceId"], day)] = avail - use
                need -= use
                if first is None:
                    first = day
                last = day
            day += 1
        overflow = need > 1e-9
        st["idx"] += 1
        st["ready"] = (last + 1) if first is not None else start
        out_ops[wid].append(
            {
                "seq": op["seq"],
                "resourceId": op["resourceId"],
                "minutes": round(op["minutes"], 1),
                "startDay": horizon[first] if first is not None else None,
                "endDay": horizon[min(last, H - 1)] if first is not None else None,
                "overflow": overflow,
            }
        )
        completion[wid] = (last + 1) if first is not None else start
        placed += 1

    jobs_out = []
    for wid, job in bundle["jobs"].items():
        c = completion.get(wid, 0)
        due_idx = day_index.get(job["due"], H)
        tardy = max(0, c - due_idx)
        jobs_out.append(
            {
                "id": wid,
                "product": job["product"],
                "qty": job["qty"],
                "priority": job["priority"],
                "dueDay": job["due"],
                "completionDay": horizon[min(c, H - 1)] if c < H else None,
                "tardinessDays": tardy,
                "onTime": tardy == 0 and c < H,
                "operations": out_ops[wid],
            }
        )
    jobs_out.sort(key=lambda j: j["id"])
    return {"jobs": jobs_out, "completedAll": all(completion.get(w, 0) < H for w in bundle["jobs"])}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--verbose", action="store_true")
    parser.add_argument("--forward-only", action="store_true", help="schedule only operations planned on/after the horizon start")
    parser.add_argument("--all", action="store_true", help="include SUPERSEDED schedule versions (historical plan)")
    args = parser.parse_args()

    bundle = build(forward_only=args.forward_only, include_superseded=args.all)
    feas = feasibility(bundle)
    plan = schedule(bundle)

    late = [j for j in plan["jobs"] if not j["onTime"]]
    result = {
        "solver": solver_signature(),
        "method": "contract-dispatch (rate-based cumulative)",
        "source": "COOLIT_Synthetic_Enterprise_Data_v3.2",
        "contract": {
            "operation_duration": "setup_minutes + quantity × run_minutes_per_unit",
            "capacity_bucket": "available_minutes_per_day × business_days × concurrent_units",
        },
        "feasibility": feas,
        "plan": plan,
    }
    result["resultHash"] = sha256_of({k: v for k, v in result.items() if k != "resultHash"})
    write_json(OUT, result)

    print(f"contract run  source v3.2  horizon {feas['horizonDays']} business days")
    print(f"jobs {len(plan['jobs'])}  operations {sum(len(j['operations']) for j in plan['jobs'])}")
    print(f"feasibleWithinHorizon {feas['feasibleWithinHorizon']}   overloaded resource-weeks: {len(feas['overloadedWeeks'])}")
    for rid, v in feas["resources"].items():
        print(f"  {rid:16s} demand {v['demandMinutes']:8.0f} min  capacity {v['capacityMinutes']:8.0f} min  util {v['utilisation']}")
    print(f"on-time {len(plan['jobs']) - len(late)}/{len(plan['jobs'])}   late {len(late)}")
    for j in late[:8]:
        print(f"  {j['id']:9s} due {j['dueDay']}  complete {j['completionDay']}  tardy {j['tardinessDays']}d")
    if len(late) > 8:
        print(f"  ... {len(late) - 8} more")
    print(f"wrote {os.path.relpath(OUT, os.path.dirname(os.path.dirname(HERE)))}")


if __name__ == "__main__":
    main()