# FORGE Decision Room — Sample Run

End-to-end run of the current build on the COOLIT fixture. No network, no browser, no
Gurobi at runtime — the solver runs at build time and its output is frozen.

```
$ npm run solver      # Gurobi 12.0.3 (seed 0, threads 1) → src/generated/solver-artifacts.ts
$ npm run verify      # deterministic services + solver artifact
$ npm run verify:server
$ npm run build       # tsc (src) + tsc (server) + vite build
$ npm run sample      # the run below
```

## Solver + allocation (family A/B)

```
0. SOLVER
engine    gurobi 12.0.3   seed 0   threads 1   method 2
capacity  192 healthy + 112 degraded = 304 leak tests

2. ALLOCATION (Gurobi MIP, baseline)
FROZEN-HORIZON  200/200  short 0
COM-1104        48/48    short 0
COM-1042        56/120   short 64

3. RECOVERY OPTION (third shift, Gurobi-optimal)
hand-authored option  6 shifts  $6624
Gurobi optimum        4 shifts  $4416   ->  saves $2208, clears promise: true
```

The allocation baseline **reproduces the fixture exactly**; the optimizer finds a **cheaper
recovery than the hand-authored option** (4 shifts vs 6).

## Finite-capacity schedule (family B)

```
4. FINITE-CAPACITY SCHEDULE (Gurobi MIP)
COM-1104  [FROZEN] due 2026-10-10  capable 2026-10-07  tardy 0d  onTime true
          RES-ASM-01@2026-09-28 -> RES-ELEC-01@2026-09-30 -> RES-LT-01@2026-10-02 -> RES-SHIP-01@2026-10-06
COM-1018  due 2026-10-15  capable 2026-10-15  tardy 0d  onTime true
          RES-ASM-02@2026-09-30 -> RES-FT-02@2026-10-06 -> RES-SHIP-01@2026-10-08
COM-1042  due 2026-10-15  capable 2026-10-21  tardy 4d  onTime false
          RES-ASM-01@2026-09-30 -> RES-LT-01@2026-10-09 -> RES-SHIP-01@2026-10-19
COM-0991  due 2026-11-06  capable 2026-10-09  tardy 0d  onTime true
          RES-ASM-02@2026-09-28 -> RES-LT-01@2026-09-30 -> RES-SHIP-01@2026-10-05

5. SHIP-DAY RULE (W5 / inverts N-01)
FLAG  COM-1104 promises 2026-10-10, which is not a working ship day; the next valid ship day is 2026-10-12.

6. PLAN SUMMARY
commitments 4   on-time 3   late COM-1042   frozen COM-1104
```

- **Frozen protection (B-04):** COM-1104's operations are pinned to their committed starts; lower-priority work schedules around them.
- **Ship-day rule (B-05):** COM-1104's Saturday promise is flagged and normalised to Monday 12 Oct — the assertion that used to encode the defect (N-01) is now backed by a correct rule.

## Governed action chain

```
7. GOVERNED ACTION CHAIN (COM-1042 third shift)
baseline   infeasible · short 64 · ship 2026-10-19
scenario   DR-COM-1042-R1 on file; baseline DR-COM-1042-BASE unchanged
selected   OPT-THIRD-SHIFT (by Shift Executive)
request    APR-COM-1042-1 · requested by Shift Executive · requires manufacturing-manager (finance)
approval   status approved
receipt    dry-run accepted · baselineMutated false
receipt    execute accepted · reconciliation pending
outcome    successful false (an accepted writeback is not a shipped commitment)
```

Approval ≠ execution; a Shift Executive proposes, a Manufacturing Manager approves, the
dry run precedes execute, the baseline is never mutated, and a receipt is not a shipped
commitment.

## Live app sample (dev server)

`npm run dev` → `http://localhost:5174/`. Captured DOM excerpt:

> FORGE · Decision room · YYC-01 · Manufacturing Manager · COM-1042 · Baseline · as of 08:15
>
> Decision queue — AT RISK COM-1042 (T-19d · Leak-test capacity) · AWAITING COM-1018 (MV-14
> supplier commit) · APPROVED COM-1104 · MONITORING COM-0991
>
> Ledger — COM-1042 CPL-480 ×120 · promised 15 October · capable 19 October (+4d) ·
> ⟳ Leak-test capacity 56/120 short 64 · INFEASIBLE · investigating
>
> Copilot — "The 15 October commitment is currently infeasible." / "Leak-test capacity is the
> binding constraint." / derived 64, 56, 280, 2026-10-19, with source facts and the ERP⇄WMS
> conflict. Next governed action: Why · Blast radius · Run recovery scenario.

## Verification status

| Layer | Command | Result |
|---|---|---|
| Solver build | `npm run solver` | OPTIMAL allocation + schedule |
| Deterministic services | `npm run verify` | green |
| Server/router | `npm run verify:server` | green |
| Typecheck (src + server) | `npm run build` | green |
| Production bundle | `vite build` | green |

## Known gap surfaced by this run

The ledger and UI still render the **model-level** capable date (COM-1042 = 19 Oct, from leak
tests alone) and do not yet surface the ship-day flag or the scheduler's operation-level
capable date (21 Oct). Wiring `src/plan.ts` into `ledger.ts`/`App.tsx` is the next integration
task (Execution Task List A-09 / U-03); it must bump the golden hashes deliberately.