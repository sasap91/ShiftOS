/**
 * Persona acceptance runner (T-12).
 *
 * Runs the 48 persona scripts through the real control plane (classify + runTurn)
 * and records pass/fail/skip. `blocked` cases (seams not yet built) are counted
 * `skip` in `--phase=now` and must pass in `--phase=target`.
 *
 * Run: npm run verify:persona            (now mode)
 *      npm run verify:persona -- --phase=target
 *
 * Writes var/acceptance/{date}.json and var/acceptance/matrix.md.
 * Exits non-zero if any counted case fails (the persona matrix gates CI).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { type Role } from "../../src/model";
import { domainOf, viewMemory } from "../../src/disclosure";
import { memoriesFor } from "../../src/memory";
import { runTurn } from "../chat";
import { classify } from "../router/router";
import { CASES, CRITERIA, ROLES, type Case } from "./cases";
import { evaluate } from "./expect";

const FIXTURE_MEMORIES = [...memoriesFor("COM-1042"), ...memoriesFor("COM-1018")];

type Status = "pass" | "fail" | "skip";
type Result = { id: string; role: Role; criterion: number; status: Status; detail: string };

const phaseArg = process.argv.find((arg) => arg.startsWith("--phase="));
const phase = (phaseArg?.split("=")[1] ?? "now") as "now" | "target";
const commitmentId = "COM-1042";

async function runCase(test: Case): Promise<Result> {
  const base = { id: test.id, role: test.role, criterion: test.criterion };
  if (test.expect.kind === "blocked") {
    return { ...base, status: "skip", detail: test.expect.gap };
  }
  if (test.expect.kind === "redaction") {
    const { domain, expectHidden } = test.expect;
    const memory = FIXTURE_MEMORIES.find((row) => domainOf(row) === domain);
    if (!memory) return { ...base, status: "fail", detail: `no fixture memory in domain ${domain}` };
    const view = viewMemory(test.role, memory);
    const ok = view.visible === !expectHidden && (view.visible || Boolean(view.reasonCode));
    return { ...base, status: ok ? "pass" : "fail", detail: `${view.domain} visible=${view.visible} level=${view.level} reason=${view.reasonCode ?? "—"}` };
  }
  const route = classify({ role: test.role, text: test.input.text, action: test.input.action });
  const needsTurn = test.expect.kind === "block" || test.expect.kind === "answer";
  const turn = needsTurn
    ? (await runTurn({ role: test.role, commitmentId, text: test.input.text, action: test.input.action })).turn
    : null;
  const outcome = evaluate(test.expect, route, turn);
  return { ...base, status: outcome.ok ? "pass" : "fail", detail: outcome.detail };
}

function matrix(results: Result[]): string {
  const header = "| Role | " + Object.keys(CRITERIA).map((c) => `C${c}`).join(" | ") + " | Overall |";
  const sep = "|" + "---|".repeat(Object.keys(CRITERIA).length + 2);
  const rows = ROLES.map((role) => {
    const mine = results.filter((row) => row.role === role);
    const cells = Object.keys(CRITERIA).map((criterion) => {
      const inCriterion = mine.filter((row) => row.criterion === Number(criterion));
      const counted = inCriterion.filter((row) => row.status !== "skip");
      if (!inCriterion.length) return "—";
      if (!counted.length) return "⛔";
      const passed = counted.filter((row) => row.status === "pass").length;
      return passed === counted.length ? "✅" : "⚠️";
    });
    const counted = mine.filter((row) => row.status !== "skip");
    const passed = counted.filter((row) => row.status === "pass").length;
    return `| ${role} | ${cells.join(" | ")} | ${passed}/${counted.length} |`;
  });
  return [header, sep, ...rows].join("\n");
}

async function main() {
  const results: Result[] = [];
  for (const test of CASES) results.push(await runCase(test));

  const counted = results.filter((row) => row.status !== "skip");
  const failed = counted.filter((row) => row.status === "fail");
  const skipped = results.filter((row) => row.status === "skip");
  const gate = phase === "target" ? failed.length + skipped.length : failed.length;

  const here = dirname(fileURLToPath(import.meta.url));
  const outDir = resolve(here, "../../var/acceptance");
  mkdirSync(outDir, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  const summary = {
    generatedAt: new Date().toISOString(),
    phase,
    commitmentId,
    total: results.length,
    counted: counted.length,
    passed: counted.length - failed.length,
    failed: failed.length,
    skipped: skipped.length,
    byRole: Object.fromEntries(
      ROLES.map((role) => {
        const mine = results.filter((row) => row.role === role);
        const mc = mine.filter((row) => row.status !== "skip");
        return [role, { passed: mc.filter((r) => r.status === "pass").length, counted: mc.length, skipped: mine.length - mc.length }];
      }),
    ),
    results,
  };
  writeFileSync(resolve(outDir, `${date}.json`), JSON.stringify(summary, null, 2));
  writeFileSync(
    resolve(outDir, "matrix.md"),
    [
      "# Persona Acceptance Matrix",
      "",
      `Generated ${summary.generatedAt} · phase **${phase}** · commitment ${commitmentId}`,
      "",
      matrix(results),
      "",
      `Legend: ✅ all counted pass · ⚠️ a counted case failed · ⛔ all blocked · — no case`,
      "",
      `**${summary.passed}/${summary.counted} counted pass · ${summary.skipped} skipped (blocked seams) · ${summary.failed} failed**`,
      "",
    ].join("\n"),
  );

  console.log("\nPersona acceptance");
  console.log("==================");
  for (const row of results) {
    const mark = row.status === "pass" ? "PASS" : row.status === "fail" ? "FAIL" : "SKIP";
    console.log(`${mark.padEnd(4)} ${row.id}  C${row.criterion}  ${row.role.padEnd(20)} ${row.detail}`);
  }
  console.log(`\n${summary.passed}/${summary.counted} counted pass · ${summary.skipped} skipped · ${summary.failed} failed · phase=${phase}`);
  console.log(`wrote var/acceptance/${date}.json and var/acceptance/matrix.md`);
  if (gate) {
    console.log(`\n${gate} case(s) blocked the gate`);
    process.exit(1);
  }
  console.log("\npersona acceptance passed.");
}

void main();