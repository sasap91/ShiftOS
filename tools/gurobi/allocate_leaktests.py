"""Family A/B allocation MILP — the leak-test capacity allocation fixture.

Reproduces the deterministic fixture in src/model.ts (allocateLeakTests) and
extends it with an overtime (third-shift) recovery model, solved to proven
optimality with Gurobi. Usage:

    python3 tools/gurobi/allocate_leaktests.py [--verbose]

Writes tools/gurobi/out/allocation.json.
"""

from __future__ import annotations

import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

import gurobipy as gp
from gurobipy import GRB

from common import new_env, sha256_of, solver_signature, status_name, write_json

HERE = os.path.dirname(__file__)
OUT = os.path.join(HERE, "out", "allocation.json")

# --- Fixture mirrored from src/model.ts -------------------------------------
# Healthy business days 28 Sep - 5 Oct (6), degraded business days 6-14 Oct (7).
HEALTHY_DAYS = ["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-05"]
DEGRADED_DAYS = ["2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-12", "2026-10-13", "2026-10-14"]

BASE_SHIFTS = 2
RATE_PER_SHIFT = 16
SHIFT_HOURS = 8
OT_RATE_CAD = 92
OT_PREMIUM = 1.5
OT_SHIFT_COST_CAD = SHIFT_HOURS * OT_RATE_CAD * OT_PREMIUM  # 1104 per extra shift-day
EXTRA_SHIFT_UNITS = RATE_PER_SHIFT  # an extra shift adds one shift's worth of tests

# Demand, priority 0 = frozen (hard), lower number = higher priority.
DEMAND = [
    {"id": "FROZEN-HORIZON", "priority": 0, "required": 200, "frozen": True, "uom": "tests"},
    {"id": "COM-1104", "priority": 1, "required": 48, "frozen": False, "uom": "tests"},
    {"id": "COM-1042", "priority": 3, "required": 120, "frozen": False, "uom": "tests"},
]

MODEL_VERSION = "ctp-0.3.0"
MASTER_SET_VERSION = "MS-2026-09-26"
SNAPSHOT_ID = "SNAP-20260926-0815"


def capacity() -> dict:
    healthy = len(HEALTHY_DAYS) * BASE_SHIFTS * RATE_PER_SHIFT
    degraded = len(DEGRADED_DAYS) * BASE_SHIFTS * (RATE_PER_SHIFT // 2)
    return {"healthy": healthy, "degraded": degraded, "total": healthy + degraded}


def solve(allow_overtime: bool, verbose: bool = False) -> dict:
    env = new_env(verbose)
    model = gp.Model("leaktest_allocation", env=env)

    days = [(d, BASE_SHIFTS * RATE_PER_SHIFT, True) for d in HEALTHY_DAYS] + [
        (d, BASE_SHIFTS * (RATE_PER_SHIFT // 2), False) for d in DEGRADED_DAYS
    ]

    x = {
        (row["id"], day): model.addVar(vtype=GRB.INTEGER, lb=0, ub=row["required"], name=f"x_{row['id']}_{day}")
        for row in DEMAND
        for (day, _cap, _healthy) in days
    }
    u = {row["id"]: model.addVar(vtype=GRB.BINARY, name=f"u_{row['id']}") for row in DEMAND if not row["frozen"]}
    e = {
        day: model.addVar(vtype=GRB.BINARY, name=f"e_{day}")
        for (day, _cap, healthy) in days
        if healthy and allow_overtime
    }

    # Finite day capacity (+ optional extra certified shift on healthy days).
    for (day, cap, healthy) in days:
        load = gp.quicksum(x[(row["id"], day)] for row in DEMAND)
        extra = EXTRA_SHIFT_UNITS * e[day] if (healthy and allow_overtime) else 0
        model.addConstr(load <= cap + extra, name=f"cap_{day}")

    # Frozen supply is a hard gate; other demand may be partial.
    for row in DEMAND:
        served = gp.quicksum(x[(row["id"], day)] for (day, _c, _h) in days)
        if row["frozen"]:
            model.addConstr(served == row["required"], name=f"frozen_{row['id']}")
        else:
            model.addConstr(served <= row["required"], name=f"ub_{row['id']}")
            model.addConstr(served >= row["required"] * u[row["id"]], name=f"serve_{row['id']}")

    # Lexicographic service by priority: fully serve higher priority before lower.
    for priority in sorted({row["priority"] for row in DEMAND if not row["frozen"]}):
        members = [row for row in DEMAND if (not row["frozen"]) and row["priority"] == priority]
        model.setObjective(gp.quicksum(u[row["id"]] for row in members), GRB.MAXIMIZE)
        model.optimize()
        if model.Status not in (GRB.OPTIMAL, GRB.SUBOPTIMAL):
            return {"status": status_name(model.Status), "allowOvertime": allow_overtime}
        for row in members:
            model.addConstr(u[row["id"]] == round(u[row["id"]].X), name=f"fix_{row['id']}")

    # Then minimise overtime days and residual shortfall.
    shortfall_expr = gp.quicksum(
        (row["required"] - gp.quicksum(x[(row["id"], day)] for (day, _c, _h) in days))
        for row in DEMAND
        if not row["frozen"]
    )
    overtime_term = gp.quicksum(e[day] for day in e) if e else 0
    model.setObjective(10_000 * overtime_term + shortfall_expr, GRB.MINIMIZE)
    model.optimize()

    status = status_name(model.Status)
    if model.Status not in (GRB.OPTIMAL, GRB.SUBOPTIMAL):
        return {"status": status, "allowOvertime": allow_overtime}

    allocations = []
    for row in DEMAND:
        served = 0
        per_day = []
        for (day, _c, _h) in days:
            value = int(round(x[(row["id"], day)].X))
            served += value
            if value:
                per_day.append({"day": day, "tests": value})
        allocations.append(
            {
                "id": row["id"],
                "priority": row["priority"],
                "frozen": row["frozen"],
                "required": row["required"],
                "allocated": served,
                "shortfall": max(0, row["required"] - served),
                "days": per_day,
            }
        )

    overtime_days = sorted(day for day in e if round(e[day].X) == 1) if e else []
    overtime_cost = len(overtime_days) * OT_SHIFT_COST_CAD

    # Explainable capacity value: marginal effect of one more test of capacity.
    capacity_value = _capacity_marginal(allow_overtime, verbose=False)

    inputs = {
        "snapshotId": SNAPSHOT_ID,
        "masterSetVersion": MASTER_SET_VERSION,
        "modelVersion": MODEL_VERSION,
        "allowOvertime": allow_overtime,
        "capacity": capacity(),
        "demand": [{k: r[k] for k in ("id", "priority", "required", "frozen")} for r in DEMAND],
        "solver": solver_signature(),
    }
    result = {
        "solver": solver_signature(),
        "status": status,
        "inputsHash": sha256_of(inputs),
        "objective": round(model.ObjVal, 6),
        "allowOvertime": allow_overtime,
        "capacity": capacity(),
        "allocations": allocations,
        "overtimeDays": overtime_days,
        "overtimeShifts": len(overtime_days),
        "overtimeCostCad": overtime_cost,
        "capacityMarginalTestsPerUnit": capacity_value,
    }
    result["resultHash"] = sha256_of({k: v for k, v in result.items() if k not in ("resultHash",)})
    return result


def _capacity_marginal(allow_overtime: bool, verbose: bool = False) -> int:
    """One extra unit of window capacity is worth this many more served tests."""
    base = _total_served(allow_overtime, extra_capacity=0)
    plus = _total_served(allow_overtime, extra_capacity=1)
    return plus - base


def _total_served(allow_overtime: bool, extra_capacity: int) -> int:
    env = new_env(False)
    model = gp.Model("marginal", env=env)
    days = [(d, BASE_SHIFTS * RATE_PER_SHIFT, True) for d in HEALTHY_DAYS] + [
        (d, BASE_SHIFTS * (RATE_PER_SHIFT // 2), False) for d in DEGRADED_DAYS
    ]
    x = {
        (row["id"], day): model.addVar(vtype=GRB.INTEGER, lb=0, ub=row["required"])
        for row in DEMAND
        for (day, _c, _h) in days
    }
    for (day, cap, healthy) in days:
        bonus = extra_capacity if day == HEALTHY_DAYS[-1] else 0
        model.addConstr(gp.quicksum(x[(row["id"], day)] for row in DEMAND) <= cap + bonus)
    for row in DEMAND:
        served = gp.quicksum(x[(row["id"], day)] for (day, _c, _h) in days)
        if row["frozen"]:
            model.addConstr(served == row["required"])
        else:
            model.addConstr(served <= row["required"])
    total = sum(row["required"] for row in DEMAND)
    model.setObjective(gp.quicksum(x[key] for key in x), GRB.MAXIMIZE)
    model.optimize()
    if model.Status != GRB.OPTIMAL:
        return 0
    return int(round(model.ObjVal))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args()

    baseline = solve(allow_overtime=False, verbose=args.verbose)
    recovery = solve(allow_overtime=True, verbose=args.verbose)
    artifact = {
        "generator": "tools/gurobi/allocate_leaktests.py",
        "solver": solver_signature(),
        "fixture": {
            "snapshotId": SNAPSHOT_ID,
            "masterSetVersion": MASTER_SET_VERSION,
            "modelVersion": MODEL_VERSION,
            "capacity": capacity(),
            "healthyDays": HEALTHY_DAYS,
            "degradedDays": DEGRADED_DAYS,
        },
        "baseline": baseline,
        "recovery": recovery,
    }
    write_json(OUT, artifact)

    print(f"solver           gurobi {'.'.join(str(v) for v in gp.gurobi.version())} (seed {solver_signature()['seed']}, threads 1)")
    for label, res in (("baseline", baseline), ("recovery(3rd shift)", recovery)):
        alloc = ", ".join(f"{a['id']}={a['allocated']}/{a['required']}" for a in res["allocations"])
        print(f"{label:20s} {res['status']:8s} {alloc}  OT={res['overtimeShifts']} shifts (${res['overtimeCostCad']})")
    print(f"baseline capacity marginal value: {baseline['capacityMarginalTestsPerUnit']} test/unit")
    print(f"wrote {os.path.relpath(OUT, os.path.dirname(os.path.dirname(HERE)))}")


if __name__ == "__main__":
    main()