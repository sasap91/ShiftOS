import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  type ApprovalRequest,
  type QueueState,
  type Role,
  PEOPLE,
  ROLE_POLICY,
  assess,
  blastRadius,
  formatDay,
  formatMoney,
} from "./model";
import {
  type Block,
  type Intent,
  type Thread,
  type Turn,
  activeEnvelope,
  interpret,
  openThread,
  reduce,
} from "./orchestrator";
import { LedgerView } from "./features/orders/LedgerView";
import { buildLedger } from "./ledger";
import { MASTER_SET_VERSION } from "./master";
import { FilterRail, DEFAULT_FILTERS, type Filters } from "./features/scope/FilterRail";
import { ShopFloor } from "./features/floor/ShopFloor";
import { HORIZONS, flowStagesForRow, lensSort, ownerOf, rowsInZone, zoneById, type Horizon } from "./zones";
import type { ActiveContext } from "./shared/v2";
import { assistantHealth, sendChatMessage } from "./features/chat/client";

const ROLES = [
  PEOPLE["manufacturing-manager"],
  PEOPLE["shift-planner"],
  PEOPLE["maintenance-manager"],
  PEOPLE["demand-planner"],
];
const QUEUE_LABEL: Record<QueueState, string> = {
  "at-risk": "At risk",
  awaiting: "Awaiting",
  approved: "Approved",
  monitoring: "Monitoring",
};
const COMMITMENT_IDS = ["COM-1042", "COM-1018", "COM-1104", "COM-0991"];
const RISK_GROUPS: QueueState[] = ["at-risk", "awaiting", "approved", "monitoring"];

type UrlState = { role?: Role; order?: string; zone?: string; horizon?: Horizon };
type ConversationEntry = { kind: "turn"; id: string; commitmentId: string; role: Role; turn: Turn };

const CHAT_CACHE = "forge-v2:chat:local-user";

/** Read the room context from the URL (V-09): role · order · zone · horizon. */
function readUrl(): UrlState {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const role = params.get("role");
  const order = params.get("order");
  const zone = params.get("zone");
  const weeks = Number((params.get("horizon") ?? "").replace(/[^0-9]/g, ""));
  return {
    role: role && ROLES.some((person) => person.role === role) ? (role as Role) : undefined,
    order: order && COMMITMENT_IDS.includes(order) ? order : undefined,
    zone: zone && zoneById(zone) ? zone : undefined,
    horizon: (HORIZONS as readonly number[]).includes(weeks) ? (weeks as Horizon) : undefined,
  };
}

function initialThreads(): Record<string, Thread> {
  const seeded = {
    "COM-1042": openThread("COM-1042"),
    "COM-1018": openThread("COM-1018"),
    "COM-1104": openThread("COM-1104"),
    "COM-0991": openThread("COM-0991"),
  };
  return Object.fromEntries(Object.entries(seeded).map(([id, thread]) => [id, { ...thread, turns: [] }]));
}

function initialConversation(): ConversationEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const cached = JSON.parse(window.localStorage.getItem(CHAT_CACHE) ?? "[]") as Array<ConversationEntry | { kind: "context" }>;
    return cached.filter((entry): entry is ConversationEntry => entry.kind === "turn");
  } catch {
    return [];
  }
}

export function App() {
  const url = useMemo(readUrl, []);
  const [threads, setThreads] = useState(initialThreads);
  const [activeId, setActiveId] = useState(url.order ?? "COM-1042");
  const [role, setRole] = useState<Role>(url.role ?? "manufacturing-manager");
  const [filters, setFilters] = useState<Filters>(url.horizon ? { ...DEFAULT_FILTERS, horizon: url.horizon } : DEFAULT_FILTERS);
  const [selectedZone, setSelectedZone] = useState<string | null>(url.zone ?? null);
  const [draft, setDraft] = useState("");
  const [conversation, setConversation] = useState<ConversationEntry[]>(initialConversation);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [shownSteps, setShownSteps] = useState(0);
  const [generalBusy, setGeneralBusy] = useState(false);
  const [connection, setConnection] = useState<"checking" | "connected" | "limited">("checking");
  const [pane, setPane] = useState<"queue" | "ledger" | "chat">("ledger");
  const [focusCell, setFocusCell] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const thread = threads[activeId];
  const envelope = activeEnvelope(role, thread);
  const busy = pendingId !== null || generalBusy;
  const ledgerRows = useMemo(() => buildLedger(threads), [threads]);
  const filteredRows = useMemo(
    () =>
      ledgerRows.filter((row) => {
        if (filters.risk.length && !filters.risk.includes(row.risk)) return false;
        if (filters.product.length && !filters.product.includes(row.family)) return false;
        if (filters.flow.length && !flowStagesForRow(row).some((stage) => filters.flow.includes(stage))) return false;
        if (filters.owner.length && !filters.owner.includes(ownerOf(row))) return false;
        if (row.timeToImpactDays > filters.horizon * 7) return false;
        if (selectedZone && rowsInZone([row], selectedZone).length === 0) return false;
        if (filters.query.trim()) {
          const hay = `${row.commitmentId} ${row.customer} ${row.product} ${row.family}`.toLowerCase();
          if (!hay.includes(filters.query.trim().toLowerCase())) return false;
        }
        return true;
      }),
    [ledgerRows, filters, selectedZone],
  );
  const activeFilterCount =
    filters.risk.length + filters.product.length + filters.flow.length + filters.owner.length + (filters.query.trim() ? 1 : 0) + (selectedZone ? 1 : 0);
  const queueRows = useMemo(() => lensSort(filteredRows, ROLE_POLICY[role].lens), [filteredRows, role]);

  useEffect(() => {
    if (!pendingId) return;
    const pending = conversation.find((entry) => entry.kind === "turn" && entry.turn.id === pendingId);
    if (!pending) return;
    if (pending.kind !== "turn" || shownSteps >= pending.turn.progress.length) {
      setPendingId(null);
      return;
    }
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => setShownSteps((count) => count + 1), reduceMotion ? 0 : 420);
    return () => window.clearTimeout(timer);
  }, [conversation, pendingId, shownSteps]);

  const turnCount = conversation.length;
  useEffect(() => {
    const log = logRef.current;
    if (!log) return;
    if (turnCount <= 1 && !pendingId) {
      log.scrollTo({ top: 0 });
      return;
    }
    log.scrollTo({ top: log.scrollHeight });
  }, [turnCount, shownSteps, pendingId]);

  useEffect(() => {
    window.localStorage.setItem(CHAT_CACHE, JSON.stringify(conversation));
  }, [conversation]);

  useEffect(() => {
    assistantHealth()
      .then(setConnection)
      .catch(() => setConnection("limited"));
  }, []);

  // Persist the room context to the URL (V-09) so a reload restores it.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams();
    params.set("role", role);
    params.set("order", activeId);
    params.set("horizon", `${filters.horizon}w`);
    if (selectedZone) params.set("zone", selectedZone);
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }, [role, activeId, selectedZone, filters.horizon]);

  function commit(current: Thread, intent: Intent) {
    if (busy) return;
    const result = reduce(current, activeEnvelope(role, current), intent);
    if (!result.turn.blocks.length && !result.turn.prompt) {
      setThreads((prev) => ({ ...prev, [current.commitmentId]: result.thread }));
      return;
    }
    const next = { ...result.thread, turns: [...result.thread.turns, result.turn] };
    setThreads((prev) => ({ ...prev, [current.commitmentId]: next }));
    setConversation((entries) => [
      ...entries,
      { kind: "turn", id: result.turn.id, commitmentId: current.commitmentId, role, turn: result.turn },
    ]);
    if (result.turn.progress.length) {
      setShownSteps(0);
      setPendingId(result.turn.id);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    const intent = interpret(text);
    if (intent.type !== "ask") {
      commit(thread, intent);
      void sendChatMessage(text, activeContext()).catch(() => undefined);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setGeneralBusy(true);
    try {
      const payload = await sendChatMessage(text, activeContext(), controller.signal);
      const turn: Turn = {
        id: payload.message.id,
        speaker: PEOPLE[role].roleLabel,
        prompt: text,
        tools: [],
        progress: [],
        blocks: [
          { kind: "answer", text: payload.message.content },
          ...(payload.limitations.length ? [{ kind: "note" as const, text: `Availability: ${payload.limitations.join(" · ")}` }] : []),
        ],
      };
      setConversation((entries) => [...entries, { kind: "turn", id: turn.id, commitmentId: activeId, role, turn }]);
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        const turn: Turn = {
          id: `error-${Date.now()}`,
          speaker: PEOPLE[role].roleLabel,
          prompt: text,
          tools: [],
          progress: [],
          blocks: [{ kind: "answer", text: "The assistant could not be reached. Your order data remains available in the table." }],
        };
        setConversation((entries) => [...entries, { kind: "turn", id: turn.id, commitmentId: activeId, role, turn }]);
      }
    } finally {
      abortRef.current = null;
      setGeneralBusy(false);
    }
  }

  function activeContext(): ActiveContext {
    return { role, orderId: activeId, ...(selectedZone ? { zone: selectedZone } : {}), horizon: filters.horizon };
  }

  return (
    <div className="app">
      <header className="topbar" aria-label="Decision context">
        <div className="topbar-main">
          <span className="brand">FORGE</span>
          <span>{envelope.siteLabel}</span>
          <span>{envelope.user.roleLabel}</span>
          <span className="mono">{envelope.commitmentId}</span>
          <span className={`connection ${connection}`}><i aria-hidden="true" />{connection === "connected" ? "Assistant connected" : connection === "checking" ? "Checking assistant" : "Local evidence mode"}</span>
        </div>
        <div className="topbar-role">
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as Role)}
            aria-label="Authorization role"
          >
            {ROLES.map((person) => (
              <option key={person.role} value={person.role}>
                {person.roleLabel}
              </option>
            ))}
          </select>
          <details className="info">
            <summary aria-label="Context details">i</summary>
            <dl>
              <div>
                <dt>Snapshot</dt>
                <dd>{envelope.snapshotId}</dd>
              </div>
              <div>
                <dt>Master set</dt>
                <dd>{MASTER_SET_VERSION}</dd>
              </div>
              <div>
                <dt>Freshness</dt>
                <dd>
                  Fresh {envelope.freshness.fresh} · stale {envelope.freshness.stale}
                </dd>
              </div>
              <div>
                <dt>Conflicts</dt>
                <dd>
                  {envelope.unresolvedConflicts} unresolved
                </dd>
              </div>
              <div>
                <dt>Scope</dt>
                <dd>{envelope.authorization.scope}</dd>
              </div>
            </dl>
          </details>
        </div>
      </header>
      <div className="panes" role="tablist" aria-label="Workspace">
        {(["queue", "ledger", "chat"] as const).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={pane === item}
            className={pane === item ? "pane-tab active" : "pane-tab"}
            onClick={() => setPane(item)}
          >
            {item === "queue" ? "Decision queue" : item === "ledger" ? "Commitment ledger" : "Conversation"}
          </button>
        ))}
      </div>
      <main className={`workspace pane-${pane}`}>
        <aside className="queue" aria-label="Scope and decision queue">
          <FilterRail
            filters={filters}
            count={filteredRows.length}
            selectedZone={selectedZone}
            zoneLabel={selectedZone ? zoneById(selectedZone)?.label : undefined}
            activeCount={activeFilterCount}
            onChange={setFilters}
            onClearZone={() => setSelectedZone(null)}
            onClearAll={() => {
              setFilters(DEFAULT_FILTERS);
              setSelectedZone(null);
            }}
          />
          {filteredRows.length === 0 ? (
            <p className="queue-empty" role="status">
              No decisions match. Clear {activeFilterCount} filter{activeFilterCount === 1 ? "" : "s"}.
            </p>
          ) : (
            RISK_GROUPS.map((state) => {
              const rows = queueRows.filter((row) => row.risk === state);
              if (!rows.length) return null;
              return (
                <section key={state} className={`queue-group ${state}`}>
                  <h3>
                    {QUEUE_LABEL[state]} <span>{rows.length}</span>
                  </h3>
                  {rows.map((row) => (
                    <button
                      key={row.commitmentId}
                      type="button"
                      className={row.commitmentId === activeId ? "queue-item active" : "queue-item"}
                      onClick={() => {
                        setActiveId(row.commitmentId);
                        setPendingId(null);
                      }}
                    >
                      <strong>{row.commitmentId}</strong>
                      <em>{row.family} ×{row.qty}</em>
                      <small>{`T-${row.timeToImpactDays}d · ${row.constraint.label}`}</small>
                    </button>
                  ))}
                </section>
              );
            })
          )}
        </aside>
        <section className="centre" aria-label="Middle: shop floor and order table">
          <div className="centre-split">
            <section className="middle-top" aria-label="COOLIT shop floor">
              <p className="floor-title">CoolIT shop floor</p>
              <ShopFloor rows={ledgerRows} selectedZone={selectedZone} onSelectZone={setSelectedZone} />
            </section>
            <section className="middle-bottom" aria-label="Order information table">
              <LedgerView
                rows={filteredRows}
                threads={threads}
                activeId={activeId}
                role={role}
                lens={ROLE_POLICY[role].lens}
                focusTarget={focusCell}
                onFocus={(key: string) => {
                  setFocusCell(key);
                  const [commitmentId, ...rest] = key.split(":");
                  window.location.hash = `#/commitment/${commitmentId}${rest.length ? "/" + rest.join("/") : ""}`;
                }}
                onSelect={(id: string) => {
                  setActiveId(id);
                  setPendingId(null);
                }}
              />
            </section>
          </div>
        </section>
        <aside className="chat" aria-label="Conversation">
          <div className="log" ref={logRef}>
            {conversation.map((entry) => {
              const entryThread = threads[entry.commitmentId];
              const index = entryThread.turns.findIndex((item) => item.id === entry.turn.id);
              return (
                <LogTurn
                  key={entry.id}
                  turn={entry.turn}
                  thread={entryThread}
                  hidden={entry.turn.id === pendingId && shownSteps < entry.turn.progress.length}
                  shownSteps={entry.turn.id === pendingId ? shownSteps : entry.turn.progress.length}
                  latestRecord={(kind, id) => isLatestRecord(entryThread.turns, index, kind, id)}
                  onIntent={(intent) => {
                    if (activeId !== entry.commitmentId) setActiveId(entry.commitmentId);
                    commit(entryThread, intent);
                  }}
                  onFact={(id) => { window.location.hash = `#/evidence/${entry.commitmentId}/${id}`; }}
                  role={role}
                  busy={busy}
                />
              );
            })}
          </div>
          <form className="composer chat-composer" onSubmit={onSubmit}>
            <label className="ask">
              <span className="sr">Message FORGE</span>
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                placeholder="Ask anything…"
                rows={2}
                disabled={busy}
              />
            </label>
            {generalBusy ? (
              <button type="button" onClick={() => abortRef.current?.abort()}>Stop</button>
            ) : (
              <button type="submit" className="primary" disabled={!draft.trim()}>Send</button>
            )}
          </form>
        </aside>
      </main>
    </div>
  );
}

function isLatestRecord(turns: Turn[], index: number, kind: Block["kind"], id: string) {
  return !turns.slice(index + 1).some((turn) =>
    turn.blocks.some((block) => {
      if (block.kind !== kind) return false;
      if (block.kind === "approval") return block.approvalId === id;
      if (block.kind === "receipt") return block.receiptId === id;
      if (block.kind === "outcome") return block.outcomeId === id;
      return false;
    }),
  );
}

function LogTurn({
  turn,
  thread,
  hidden,
  shownSteps,
  latestRecord,
  onIntent,
  onFact,
  role,
  busy,
}: {
  turn: Turn;
  thread: Thread;
  hidden: boolean;
  shownSteps: number;
  latestRecord: (kind: Block["kind"], id: string) => boolean;
  onIntent: (intent: Intent) => void;
  onFact: (id: string) => void;
  role: Role;
  busy: boolean;
}) {
  const packet = assess(thread.commitmentId).packet;
  return (
    <article className="turn">
      {turn.prompt ? (
        <p className="prompt">
          <span>{turn.speaker}</span>
          {turn.prompt}
        </p>
      ) : null}
      {turn.progress.length ? (
        <ul className="progress" aria-live="polite">
          {turn.progress.slice(0, shownSteps).map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
      ) : null}
      {turn.tools.length && !hidden ? (
        <p className="tools">Authorized tools · {turn.tools.join(" · ")}</p>
      ) : null}
      {!hidden
        ? turn.blocks.map((block, index) => (
            <BlockView
              key={`${turn.id}-${index}`}
              block={block}
              thread={thread}
              packetFacts={packet}
              latestRecord={latestRecord}
              onIntent={onIntent}
              onFact={onFact}
              role={role}
              busy={busy}
            />
          ))
        : null}
    </article>
  );
}

function BlockView({
  block,
  thread,
  packetFacts,
  latestRecord,
  onIntent,
  onFact,
  role,
  busy,
}: {
  block: Block;
  thread: Thread;
  packetFacts: ReturnType<typeof assess>["packet"];
  latestRecord: (kind: Block["kind"], id: string) => boolean;
  onIntent: (intent: Intent) => void;
  onFact: (id: string) => void;
  role: Role;
  busy: boolean;
}) {
  if (block.kind === "answer") return <BlockShell kind="Answer" tone="answer"><p className="answer">{block.text}</p></BlockShell>;
  if (block.kind === "why") return <BlockShell kind="Why" tone="why"><p>{block.text}</p></BlockShell>;
  if (block.kind === "explanation") {
    return (
      <BlockShell kind="AI explanation" tone="explanation">
        <p>{block.text}</p>
        <p className="footnote">Phrased from the evidence packet. Not a source record.</p>
      </BlockShell>
    );
  }
  if (block.kind === "recommendation") {
    return (
      <BlockShell kind="Recommendation" tone="recommendation">
        <p>{block.text}</p>
      </BlockShell>
    );
  }
  if (block.kind === "action") return <BlockShell kind="Executed action" tone="action"><p>{block.text}</p></BlockShell>;
  if (block.kind === "note") return <p className="note">{block.text}</p>;
  if (block.kind === "gaps" && block.texts.length) {
    return (
      <BlockShell kind="Evidence gap" tone="gap">
        <ul>
          {block.texts.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>
      </BlockShell>
    );
  }
  if (block.kind === "facts") {
    const facts = block.ids.map((id) => packetFacts.sourceFacts.find((fact) => fact.id === id)).filter((fact) => fact !== undefined);
    if (!facts.length) return null;
    return (
      <BlockShell kind="Source fact" tone="fact">
        {facts.map((fact) => (
          <button key={fact.id} type="button" className="fact-link" onClick={() => onFact(fact.id)}>
            <strong>{fact.sourceSystem}</strong> {fact.sourceRecordId}
            <span>{fact.statement}</span>
            <small>{fact.freshness === "stale" ? "Stale" : "Fresh"} · ingested {fact.ingestedAt.slice(0, 16).replace("T", " ")}</small>
          </button>
        ))}
      </BlockShell>
    );
  }
  if (block.kind === "calculations") {
    const facts = block.ids
      .map((id) => packetFacts.derivedFacts.find((fact) => fact.id === id))
      .filter((fact) => fact !== undefined);
    if (!facts.length) return null;
    return (
      <BlockShell kind="Derived calculation" tone="calc">
        {facts.map((fact) => (
          <button key={fact.id} type="button" className="fact-link" onClick={() => onFact(fact.id)}>
            <strong>{fact.result}</strong>
            <span>{fact.formula}</span>
            <small>{fact.service} · {fact.traceId}</small>
          </button>
        ))}
      </BlockShell>
    );
  }
  if (block.kind === "blast") {
    return (
      <BlockShell kind="Source fact" tone="fact">
        <ul className="blast">
          {blastRadius().map((row) => (
            <li key={row.id} className={row.causedByLeakTest && row.shortfall > 0 ? "hit" : ""}>
              <strong>{row.label}</strong>
              <span>{row.effect}</span>
            </li>
          ))}
        </ul>
      </BlockShell>
    );
  }
  if (block.kind === "options")
    return (
      <Options
        runId={block.runId}
        thread={thread}
        onIntent={onIntent}
        busy={busy}
        canSelect={ROLE_POLICY[role].canSelectOptions}
      />
    );
  if (block.kind === "approval-draft") return <ApprovalDraft runId={block.runId} optionId={block.optionId} thread={thread} onIntent={onIntent} busy={busy} />;
  if (block.kind === "approval") {
    if (!latestRecord("approval", block.approvalId)) return null;
    const approval = thread.approvals.find((row) => row.id === block.approvalId);
    if (!approval) return null;
    return <ApprovalCard approval={approval} thread={thread} role={role} onIntent={onIntent} busy={busy} />;
  }
  if (block.kind === "receipt") {
    if (!latestRecord("receipt", block.receiptId)) return null;
    const receipt = thread.receipts.find((row) => row.id === block.receiptId);
    if (!receipt) return null;
    return (
      <BlockShell kind="Receipt" tone={receipt.status === "accepted" ? "receipt" : "gap"}>
        <p>
          <strong>{receipt.status === "accepted" ? "Accepted" : "Rejected"}</strong> · {receipt.mode} · {receipt.id}
        </p>
        <p>{receipt.detail}</p>
        <p className="footnote">
          {receipt.gateway} · {receipt.target} · baseline mutated: no · reconciliation {receipt.reconciliation} · key {receipt.idempotencyKey}
        </p>
      </BlockShell>
    );
  }
  if (block.kind === "outcome") {
    if (!latestRecord("outcome", block.outcomeId)) return null;
    const outcome = thread.outcomes.find((row) => row.id === block.outcomeId);
    if (!outcome) return null;
    return (
      <BlockShell kind="Observed outcome" tone="outcome">
        <p>Expected: {outcome.expected}</p>
        <p>Observed: {outcome.observed}</p>
        <p>{outcome.reason}</p>
        <p className="footnote">Successful: no</p>
      </BlockShell>
    );
  }
  if (block.kind === "next" && block.actions.length) {
    return (
      <BlockShell kind="Next governed action" tone="next">
        <div className="next-row">
          {block.actions.map((action) => (
            <button key={action.label} type="button" disabled={busy} onClick={() => onIntent(action.intent)}>
              {action.label}
            </button>
          ))}
        </div>
      </BlockShell>
    );
  }
  return null;
}

function Options({
  runId,
  thread,
  onIntent,
  busy,
  canSelect,
}: {
  runId: string;
  thread: Thread;
  onIntent: (intent: Intent) => void;
  busy: boolean;
  canSelect: boolean;
}) {
  const run = thread.runs.find((row) => row.id === runId);
  if (!run) return null;
  return (
    <BlockShell kind="Options" tone="options">
      <ul className="options">
        {run.alternatives.map((option) => {
          const selected = thread.selectedOptionId === option.id;
          return (
            <li key={option.id} className={option.feasibility === "feasible" ? "feasible" : "infeasible"}>
              <div className="option-top">
                <strong>{option.label}</strong>
                <em>{option.feasibility === "feasible" ? "Feasible" : "Infeasible"}</em>
              </div>
              <p>
                {option.violatedHardConstraints.length
                  ? "Blocked by a hard gate."
                  : option.meetsPromise
                    ? `${option.onTimeQty} on ${formatDay(option.shipDate)}`
                    : option.changesPromise && option.lateShipDate
                      ? `${option.onTimeQty} on ${formatDay(option.shipDate)} · ${option.lateQty} on ${formatDay(option.lateShipDate)}`
                      : `Residual shortfall ${option.residualShortfall}. Full quantity ships ${formatDay(option.shipDate)}.`}
                {option.costCad !== null ? ` ${formatMoney(option.costCad)} estimate.` : ""}
              </p>
              {option.violatedHardConstraints.map((gate) => (
                <p key={gate.id} className="gate">
                  Violated hard constraint · {gate.label}
                </p>
              ))}
              {option.whyRejected ? <p>{option.whyRejected}</p> : null}
              {option.evidenceGaps.map((gap) => (
                <p key={gap} className="gap-line">
                  {gap}
                </p>
              ))}
              {option.tradeoffs.map((item) => (
                <p key={item}>{item}</p>
              ))}
              <button
                type="button"
                disabled={busy || selected || !canSelect}
                onClick={() => onIntent({ type: "select-option", optionId: option.id })}
              >
                {!canSelect
                  ? "Demand request only"
                  : option.feasibility === "infeasible"
                    ? "Cannot select"
                    : selected
                      ? "Selected"
                      : "Select"}
              </button>
            </li>
          );
        })}
      </ul>
    </BlockShell>
  );
}

function ApprovalDraft({
  runId,
  optionId,
  thread,
  onIntent,
  busy,
}: {
  runId: string;
  optionId: string;
  thread: Thread;
  onIntent: (intent: Intent) => void;
  busy: boolean;
}) {
  const [rationale, setRationale] = useState("");
  const run = thread.runs.find((row) => row.id === runId);
  const option = run?.alternatives.find((row) => row.id === optionId);
  if (!option) return null;
  return (
    <BlockShell kind="Approval" tone="approval">
      <p>
        Request approval for <strong>{option.label}</strong>. Expires 27 September 08:15 if the snapshot changes.
      </p>
      <ul>
        {option.approvers.map((approver) => (
          <li key={approver.role}>
            {PEOPLE[approver.role].name} · {PEOPLE[approver.role].roleLabel} · {approver.reason}
          </li>
        ))}
      </ul>
      <label className="rationale">
        Requester rationale
        <textarea value={rationale} onChange={(event) => setRationale(event.target.value)} rows={3} />
      </label>
      <button
        type="button"
        className="primary"
        disabled={busy || rationale.trim().length < 12}
        onClick={() => onIntent({ type: "request-approval", rationale })}
      >
        Submit approval request
      </button>
    </BlockShell>
  );
}

function ApprovalCard({
  approval,
  thread,
  role,
  onIntent,
  busy,
}: {
  approval: ApprovalRequest;
  thread: Thread;
  role: Role;
  onIntent: (intent: Intent) => void;
  busy: boolean;
}) {
  const option = thread.runs.flatMap((run) => run.alternatives).find((row) => row.id === approval.optionId);
  return (
    <BlockShell kind="Approval" tone="approval">
      <p>
        <strong>{approval.status}</strong> · {approval.id} · expires {approval.expiresAt.slice(0, 16).replace("T", " ")}
      </p>
      <p>{option?.label ?? approval.requestRationale}</p>
      <p className="footnote">Requested by {approval.requestedByName}. Rationale: {approval.requestRationale}</p>
      <ul className="approvers">
        {approval.approvers.map((person) => (
          <ApproverRow key={person.role} approvalId={approval.id} person={person} role={role} onIntent={onIntent} busy={busy} />
        ))}
      </ul>
    </BlockShell>
  );
}

function ApproverRow({
  approvalId,
  person,
  role,
  onIntent,
  busy,
}: {
  approvalId: string;
  person: ApprovalRequest["approvers"][number];
  role: Role;
  onIntent: (intent: Intent) => void;
  busy: boolean;
}) {
  const [rationale, setRationale] = useState("");
  const actor = PEOPLE[role];
  const mine = actor.role === person.role && person.status === "pending";
  return (
    <li>
      <strong>
        {person.approverName} · {PEOPLE[person.role].roleLabel}
      </strong>
      <span>
        {person.status} · {person.reason}
      </span>
      {person.authority ? (
        <span className="footnote">Policy authority · {person.authority} · resolves on policy</span>
      ) : null}
      {person.rationale ? <span>{person.rationale}</span> : null}
      {mine ? (
        <label className="rationale">
          Decision rationale
          <textarea value={rationale} onChange={(event) => setRationale(event.target.value)} rows={2} />
          <span className="row-actions">
            <button
              type="button"
              disabled={busy || rationale.trim().length < 12}
              onClick={() => onIntent({ type: "record-approval", approvalId, decision: "approved", rationale })}
            >
              Approve
            </button>
            <button
              type="button"
              disabled={busy || rationale.trim().length < 12}
              onClick={() => onIntent({ type: "record-approval", approvalId, decision: "rejected", rationale })}
            >
              Reject
            </button>
          </span>
        </label>
      ) : person.status === "pending" ? (
        <span className="footnote">Switch the authorization role to {PEOPLE[person.role].roleLabel} to record this decision.</span>
      ) : null}
    </li>
  );
}

function BlockShell({
  kind,
  tone,
  children,
}: {
  kind: string;
  tone: string;
  children: ReactNode;
}) {
  return (
    <section className={`block ${tone}`}>
      <p className="block-kind">{kind}</p>
      {children}
    </section>
  );
}
