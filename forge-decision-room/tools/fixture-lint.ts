/**
 * Fixture lint — fail-closed reference/consistency check over the whole fixture.
 *
 * Wraps the decision-memory reference lint (`lintDecisionRoom`) and adds fixture
 * completeness checks (every commitment has a master set and a baseline run).
 * Exits non-zero on any problem so it can gate CI.
 *
 * Run: npm run lint
 */
import { COMMITMENTS, assess } from "../src/model";
import { memoryRegistry, lintDecisionRoom } from "../src/memory";
import { openThread } from "../src/orchestrator";
import { masterRefsFor } from "../src/master";

const problems: string[] = [];

const ids = COMMITMENTS.map((row) => row.id);
const threads = Object.fromEntries(ids.map((id) => [id, openThread(id)]));
const registry = memoryRegistry(ids);

// 1. Reference integrity (dangling run/option/approval/receipt/master/edge ids).
problems.push(
  ...lintDecisionRoom({
    runs: Object.values(threads).flatMap((thread) => thread.runs),
    approvals: Object.values(threads).flatMap((thread) => thread.approvals),
    receipts: Object.values(threads).flatMap((thread) => thread.receipts),
    memories: registry.memories,
    edges: registry.edges,
  }),
);

// 2. Fixture completeness.
for (const row of COMMITMENTS) {
  if (masterRefsFor(row.id).length === 0) problems.push(`commitment ${row.id} has no master references`);
  const baseline = assess(row.id).baseline;
  if (baseline.kind !== "baseline") problems.push(`commitment ${row.id} baseline run is not kind=baseline`);
  if (baseline.commitmentId !== row.id) problems.push(`commitment ${row.id} baseline points at ${baseline.commitmentId}`);
}

// 3. Snapshot identity must be consistent across runs.
const snapshots = new Set(Object.values(threads).flatMap((thread) => thread.runs.map((run) => run.snapshotId)));
if (snapshots.size !== 1) problems.push(`runs span more than one snapshot: ${[...snapshots].join(", ")}`);

if (problems.length) {
  console.error(`FIXTURE LINT FAILED — ${problems.length} problem(s):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

console.log(`fixture lint passed — ${ids.length} commitments · ${registry.memories.length} memories · ${registry.edges.length} evidence edges`);