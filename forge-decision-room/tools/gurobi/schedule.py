"""Family B — finite-capacity, time-indexed production scheduling (MIP).

A flexible job-shop over business-day buckets:
  * each job is an ordered chain of routing operations;
  * each operation runs on one resource and occupies it for whole days;
  * a resource processes at most one operation per day (disjunctive capacity);
  * resources can be derated by an effective-dated factor (reference/capability_interval);
  * frozen operations can be pinned to a fixed start day;
  * objective: weighted tardiness, then makespan.

Reads the provisional fixture by default, or an Algorithm Input Bundle (AIB) input:
    python3 tools/gurobi/schedule.py
    python3 tools/gurobi/schedule.py --input tools/gurobi/fixtures/aib/aib_schedule_input.json \\
        --output tools/gurobi/out/aib_schedule.json --gap 0.01

Determinism: common.new_env() (Threads=1, Seed=0, Method=2, Presolve=2).
`--gap` is the policy gap; the achieved gap is reported and the status is labelled
FEASIBLE_WITHIN_POLICY_GAP when it is non-zero (never over-claims OPTIMAL).
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from collections import defaultdict

sys.path.insert(0, os.path.dirname(__file__))

import gurobipy as gp
from gurobipy import GRB

from common import new_env, sha256_of, solver_signature, status_name, write_json

HERE = os.path.dirname(__file__)
DEFAULT_INPUT = os.path.join(HERE, "fixtures", "schedule_input.json")
DEFAULT_OUTPUT = os.path.join(HERE, "out", "schedule.json")
LATENESS_SLACK_DAYS = 21  # how far past a due date an operation may be pushed before falling out of the window


def load_input(path: str) -> dict:
    with open(path, encoding="utf-8") as handle:
        return json.load(handle)


def normalize_priority(value) -> int:
    """Accept both the provisional numeric priority and the AIB 'P1'/'P1_RECOVERY' form."""
    if isinstance(value, (int, float)):
        return int(value)
    digits = "".join(ch for ch in str(value) if ch.isdigit())
    return int(digits) if digits else 1


def normalize(spec: dict) -> dict:
    """Normalize the AIB schedule input shape onto the solver's internal shape."""
    jobs = [
        {
            **job,
            "dueDay": job.get("dueDay") or job.get("due"),
            "priority": normalize_priority(job.get("priority", 1)),
        }
        for job in spec["jobs"]
    ]
    return {**spec, "jobs": jobs}


def effective_rate(resource: dict, day: str) -> float:
    rate = float(resource["ratePerDay"])
    for derate in resource.get("derates", []):
        if derate["from"] <= day <= derate["to"]:
            rate *= float(derate["factor"])
    return rate


def solve(spec: dict, verbose: bool = False, gap: float = 0.0, lateness_slack: int = LATENESS_SLACK_DAYS) -> dict:
    env = new_env(verbose)
    model = gp.Model("finite_schedule", env=env)
    if gap > 0:
        model.setParam("MIPGap", gap)

    horizon = spec["horizonDays"]
    H = len(horizon)
    resources = {r["id"]: r for r in spec["resources"]}
    routings = spec["routings"]
    jobs = spec["jobs"]
    job_by_id = {job["id"]: job for job in jobs}

    due_normalized = {job["id"]: _normalize_due(job["dueDay"]) for job in jobs}
    due_index = {job["id"]: _index_or_end(horizon, due_normalized[job["id"]]) for job in jobs}

    def duration_days(op: dict, resource: dict, qty: int, start: int) -> int:
        acc = 0.0
        days = 0
        cursor = start
        while acc < qty - 1e-9 and cursor < H + 60:
            day = horizon[cursor] if cursor < H else horizon[-1]
            acc += effective_rate(resource, day)
            days += 1
            cursor += 1
        return max(days, 1)

    ops = [(job["id"], index, op) for job in jobs for index, op in enumerate(routings[job["product"]])]

    z: dict = {}
    dur: dict = {}
    end_expr: dict = {}
    start_expr: dict = {}
    allowed_by_op: dict = {}

    for (job_id, index, op) in ops:
        resource = resources[op["resourceId"]]
        qty = job_by_id[job_id]["qty"]
        fixed = op.get("fixedStartDay")
        if fixed is not None:
            allowed = [fixed]
        else:
            window_end = min(H - 1, due_index[job_id] + lateness_slack)
            allowed = list(range(0, window_end + 1))
        allowed_by_op[(job_id, index)] = allowed
        for start in allowed:
            dur[(job_id, index, start)] = duration_days(op, resource, qty, start)
            z[(job_id, index, start)] = model.addVar(vtype=GRB.BINARY, name=f"z_{job_id}_{index}_{start}")
        model.addConstr(
            gp.quicksum(z[(job_id, index, start)] for start in allowed) == 1,
            name=f"one_start_{job_id}_{index}",
        )
        start_expr[(job_id, index)] = gp.quicksum(start * z[(job_id, index, start)] for start in allowed)
        end_expr[(job_id, index)] = gp.quicksum(
            (start + dur[(job_id, index, start)]) * z[(job_id, index, start)] for start in allowed
        )

    # Precedence within a job.
    for job in jobs:
        chain = [o for o in ops if o[0] == job["id"]]
        for a, b in zip(chain, chain[1:]):
            model.addConstr(end_expr[(a[0], a[1])] <= start_expr[(b[0], b[1])], name=f"prec_{job['id']}_{a[1]}_{b[1]}")

    # Disjunctive capacity: at most one operation per resource per day.
    occupancy: dict = defaultdict(list)
    for (job_id, index, op) in ops:
        for start in allowed_by_op[(job_id, index)]:
            for offset in range(dur[(job_id, index, start)]):
                day = start + offset
                if day < H:
                    occupancy[(op["resourceId"], day)].append(z[(job_id, index, start)])
    for (resource_id, day), variables in occupancy.items():
        if len(variables) > 1:
            model.addConstr(gp.quicksum(variables) <= 1, name=f"cap_{resource_id}_{day}")

    # Completion, tardiness, makespan.
    max_priority = max(job["priority"] for job in jobs)
    completion = {}
    tardiness = {}
    makespan = model.addVar(vtype=GRB.CONTINUOUS, lb=0, name="makespan")
    for job in jobs:
        chain = [o for o in ops if o[0] == job["id"]]
        completion[job["id"]] = model.addVar(vtype=GRB.CONTINUOUS, lb=0, name=f"C_{job['id']}")
        for (job_id, index, _op) in chain:
            model.addConstr(completion[job["id"]] >= end_expr[(job_id, index)], name=f"complete_{job_id}_{index}")
        model.addConstr(makespan >= completion[job["id"]], name=f"makespan_{job['id']}")
        tardiness[job["id"]] = model.addVar(vtype=GRB.CONTINUOUS, lb=0, name=f"T_{job['id']}")
        model.addConstr(tardiness[job["id"]] >= completion[job["id"]] - due_index[job["id"]], name=f"tard_{job['id']}")

    # Small integer weights keep the numerics well-scaled (large 10^k weights slow the search).
    weight = {
        job["id"]: (max_priority - job["priority"] + 1) * (10 if job.get("frozen") else 1)
        for job in jobs
    }
    model.setObjective(
        gp.quicksum(weight[job["id"]] * tardiness[job["id"]] for job in jobs) + 0.001 * makespan,
        GRB.MINIMIZE,
    )
    model.optimize()

    raw_status = status_name(model.Status)
    achieved_gap = model.MIPGap if model.SolCount else 0.0
    status = "FEASIBLE_WITHIN_POLICY_GAP" if raw_status == "OPTIMAL" and achieved_gap > 1e-9 else raw_status

    result = {
        "solver": solver_signature(),
        "status": status,
        "policyGap": gap,
        "achievedGap": round(achieved_gap, 6),
        "horizonStart": horizon[0],
        "horizonEnd": horizon[-1],
        "jobs": [],
    }
    if model.Status not in (GRB.OPTIMAL, GRB.SUBOPTIMAL, GRB.TIME_LIMIT, GRB.WORK_LIMIT):
        result["resultHash"] = sha256_of(result)
        return result
    if model.SolCount == 0:
        result["resultHash"] = sha256_of(result)
        return result

    for job in jobs:
        chain = [o for o in ops if o[0] == job["id"]]
        schedule = []
        for (job_id, index, op) in chain:
            chosen = [s for s in allowed_by_op[(job_id, index)] if round(z[(job_id, index, s)].X) == 1]
            start = chosen[0] if chosen else None
            resource = resources[op["resourceId"]]
            days = dur[(job_id, index, start)] if start is not None else None
            schedule.append(
                {
                    "seq": op["seq"],
                    "resourceId": op["resourceId"],
                    "zone": resource["zone"],
                    "startDay": horizon[start] if start is not None else None,
                    "endDay": horizon[min(start + days, H - 1)] if start is not None else None,
                    "durationDays": days,
                    "ratePerDay": op["stdRate"],
                }
            )
        result["jobs"].append(
            {
                "id": job["id"],
                "product": job["product"],
                "qty": job["qty"],
                "dueDay": job["dueDay"],
                "dueDayNormalized": due_normalized[job["id"]],
                "promiseOnNonWorkingDay": due_normalized[job["id"]] != job["dueDay"],
                "priority": job["priority"],
                "frozen": job.get("frozen", False) or any("fixedStartDay" in op for op in routings[job["product"]]),
                "completionDay": horizon[min(int(round(completion[job["id"]].X)), H - 1)],
                "tardinessDays": int(round(tardiness[job["id"]].X)),
                "operations": schedule,
            }
        )
    result["objective"] = round(model.ObjVal, 6)
    result["makespanDays"] = int(round(makespan.X))
    result["resultHash"] = sha256_of({k: v for k, v in result.items() if k != "resultHash"})
    return result


def _index_or_end(horizon: list[str], day: str) -> int:
    return horizon.index(day) if day in horizon else len(horizon) - 1


def _is_weekend(iso: str) -> bool:
    import datetime

    year, month, day = (int(part) for part in iso.split("-"))
    return datetime.date(year, month, day).weekday() >= 5


def _normalize_due(iso: str) -> str:
    """A promise on a non-working day is not a valid ship day; move to the next working day."""
    import datetime

    year, month, day = (int(part) for part in iso.split("-"))
    cursor = datetime.date(year, month, day)
    while cursor.weekday() >= 5:
        cursor += datetime.timedelta(days=1)
    return cursor.isoformat()


def solve_dispatch(spec: dict, lateness_slack: int = LATENESS_SLACK_DAYS) -> dict:
    """Deterministic non-delay list scheduling.

    For large instances a time-indexed MIP is the wrong tool (tens of thousands of
    binaries, single-threaded search). This heuristic schedules one operation per
    resource at a time in priority/due order and returns the same result schema.
    It is O(ops), fully deterministic, and explainable.
    """
    horizon = spec["horizonDays"]
    H = len(horizon)
    resources = {r["id"]: r for r in spec["resources"]}
    routings = spec["routings"]
    jobs = spec["jobs"]

    due_normalized = {job["id"]: _normalize_due(job["dueDay"]) for job in jobs}
    due_index = {job["id"]: _index_or_end(horizon, due_normalized[job["id"]]) for job in jobs}

    def duration_days(op: dict, resource: dict, qty: int, start: int) -> int:
        acc = 0.0
        days = 0
        cursor = start
        while acc < qty - 1e-9 and cursor < H + 60:
            day = horizon[cursor] if cursor < H else horizon[-1]
            acc += effective_rate(resource, day)
            days += 1
            cursor += 1
        return max(days, 1)

    # Global greedy list scheduling: at each step pick the most urgent ready
    # operation across all jobs (frozen, then priority, then due, then earliest
    # start, then id) and place it on its resource. Ops on different resources
    # overlap naturally because each uses its own resource-free clock.
    resource_free: dict = {rid: 0 for rid in resources}
    job_state = {job["id"]: {"idx": 0, "ready": 0, "completion": 0} for job in jobs}
    ops_out = {job["id"]: [] for job in jobs}
    remaining = sum(len(routings[job["product"]]) for job in jobs)

    while remaining > 0:
        best = None
        for job in jobs:
            state = job_state[job["id"]]
            chain = routings[job["product"]]
            if state["idx"] >= len(chain):
                continue
            op = chain[state["idx"]]
            est = max(state["ready"], resource_free[op["resourceId"]])
            key = (0 if job.get("frozen") else 1, due_index[job["id"]], job["priority"], est, job["id"], state["idx"])
            if best is None or key < best[0]:
                best = (key, job, op, est)
        _, job, op, est = best
        resource = resources[op["resourceId"]]
        days = duration_days(op, resource, job["qty"], est)
        resource_free[op["resourceId"]] = est + days
        state = job_state[job["id"]]
        state["idx"] += 1
        state["ready"] = est + days
        state["completion"] = est + days
        ops_out[job["id"]].append(
            {
                "seq": op["seq"],
                "resourceId": op["resourceId"],
                "zone": resource["zone"],
                "startDay": horizon[min(est, H - 1)],
                "endDay": horizon[min(est + days, H - 1)],
                "durationDays": days,
                "ratePerDay": op["stdRate"],
            }
        )
        remaining -= 1

    schedules = {
        job["id"]: {
            "ops": ops_out[job["id"]],
            "completion": job_state[job["id"]]["completion"],
            "tardiness": max(0, job_state[job["id"]]["completion"] - due_index[job["id"]]),
        }
        for job in jobs
    }

    result = {
        "solver": solver_signature(),
        "method": "dispatch",
        "status": "HEURISTIC_FEASIBLE",
        "policyGap": 0.0,
        "achievedGap": 0.0,
        "horizonStart": horizon[0],
        "horizonEnd": horizon[-1],
        "jobs": [],
    }
    completion_days = []
    for job in jobs:
        s = schedules[job["id"]]
        completion_days.append(s["completion"])
        result["jobs"].append(
            {
                "id": job["id"],
                "product": job["product"],
                "qty": job["qty"],
                "dueDay": job["dueDay"],
                "dueDayNormalized": due_normalized[job["id"]],
                "promiseOnNonWorkingDay": due_normalized[job["id"]] != job["dueDay"],
                "priority": job["priority"],
                "frozen": job.get("frozen", False) or any("fixedStartDay" in op for op in routings[job["product"]]),
                "completionDay": horizon[min(s["completion"], H - 1)],
                "tardinessDays": s["tardiness"],
                "operations": s["ops"],
            }
        )
    result["makespanDays"] = max(completion_days) if completion_days else 0
    result["objective"] = sum(
        (max(j["priority"] for j in jobs) - job["priority"] + 1) * (10 if job.get("frozen") else 1) * schedules[job["id"]]["tardiness"]
        for job in jobs
    )
    result["resultHash"] = sha256_of({k: v for k, v in result.items() if k != "resultHash"})
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default=DEFAULT_INPUT)
    parser.add_argument("--output", default=DEFAULT_OUTPUT)
    parser.add_argument("--gap", type=float, default=0.0, help="policy MIP gap (0 = prove optimal)")
    parser.add_argument("--method", choices=["mip", "dispatch"], default="mip")
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args()

    spec = normalize(load_input(args.input))
    result = solve_dispatch(spec) if args.method == "dispatch" else solve(spec, verbose=args.verbose, gap=args.gap)
    write_json(args.output, result)

    jobs = result.get("jobs", [])
    print(f"solver   gurobi {'.'.join(str(v) for v in gp.gurobi.version())}  status {result['status']}  gap {result['achievedGap']}")
    print(f"input    {os.path.basename(args.input)}  jobs {len(jobs)}  horizon {result.get('horizonStart')}..{result.get('horizonEnd')}")
    if jobs:
        late = [j for j in jobs if j["tardinessDays"] > 0]
        print(f"on-time  {len(jobs) - len(late)}/{len(jobs)}   late {len(late)}   frozen {sum(1 for j in jobs if j['frozen'])}")
        for job in (jobs if len(jobs) <= 8 else jobs[:8]):
            ops = " -> ".join(f"{o['resourceId']}@{o['startDay']}" for o in job["operations"])
            print(f"  {job['id']:9s} due {job['dueDay']}  complete {job['completionDay']}  tardy {job['tardinessDays']}d  {ops}")
        if len(jobs) > 8:
            print(f"  ... {len(jobs) - 8} more jobs")
        print(f"  makespan {result['makespanDays']}d  objective {result['objective']}")
    print(f"wrote {os.path.relpath(args.output, os.path.dirname(os.path.dirname(HERE)))}")


if __name__ == "__main__":
    main()