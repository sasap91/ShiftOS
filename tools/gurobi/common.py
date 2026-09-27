"""Shared deterministic Gurobi setup and canonical serialization for FORGE solvers.

Determinism policy (see notion/forge-algorithms-build-design.md and ADR-001):
  * Threads = 1            -> no parallel search path variation
  * Seed    = 0            -> fixed exploratory seed
  * Method  = 2            -> dual simplex (avoids the non-deterministic concurrent LP default)
  * ConcurrentMIP = 0      -> the one explicitly non-deterministic Gurobi mode is disabled
  * no wall-clock TimeLimit (wall clock is machine-dependent); WorkLimit is the deterministic bound
  * MIPGap  = 0            -> solve to proven optimality on these tiny models
  * Presolve = 2           -> deterministic aggressive presolve

Gurobi is deterministic for the same model, parameters, version and machine.
The harness pins all of those and records a solver fingerprint in every artifact.
"""

from __future__ import annotations

import hashlib
import json
import os
from typing import Any

import gurobipy as gp

SEED = 0
WORK_LIMIT = 1_000_000  # deterministic work unit bound (NOT a wall-clock limit)


def new_env(verbose: bool = False) -> gp.Env:
    """Create a freshly-configured, fully deterministic Gurobi environment."""
    env = gp.Env(empty=True)
    env.setParam("OutputFlag", 1 if verbose else 0)
    env.setParam("Seed", SEED)
    env.setParam("Threads", 1)  # single-thread => concurrent MIP is impossible
    env.setParam("Method", 2)  # dual simplex (avoids non-deterministic concurrent LP default)
    env.setParam("Presolve", 2)
    env.setParam("MIPGap", 0.0)
    env.setParam("WorkLimit", WORK_LIMIT)
    env.start()
    return env


def solver_signature() -> dict[str, Any]:
    return {
        "name": "gurobi",
        "version": ".".join(str(v) for v in gp.gurobi.version()),
        "seed": SEED,
        "threads": 1,
        "method": 2,
        "presolve": 2,
        "mipGap": 0.0,
        "workLimit": WORK_LIMIT,
    }


def canonical_json(value: Any) -> str:
    """RFC-8785-style canonical-ish JSON: sorted keys, no whitespace, ASCII."""
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True)


def sha256_of(value: Any) -> str:
    return hashlib.sha256(canonical_json(value).encode("utf-8")).hexdigest()


def write_json(path: str, value: Any) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(value, handle, indent=2, sort_keys=True)
        handle.write("\n")


def status_name(code: int) -> str:
    mapping = {
        gp.GRB.OPTIMAL: "OPTIMAL",
        gp.GRB.INFEASIBLE: "PROVEN_INFEASIBLE",
        gp.GRB.INF_OR_UNBD: "INFEASIBLE_OR_UNBOUNDED",
        gp.GRB.UNBOUNDED: "UNBOUNDED",
        gp.GRB.TIME_LIMIT: "TIME_LIMIT",
        gp.GRB.WORK_LIMIT: "WORK_LIMIT",
        gp.GRB.INTERRUPTED: "CANCELLED",
        gp.GRB.SUBOPTIMAL: "SUBOPTIMAL",
    }
    return mapping.get(code, f"STATUS_{code}")