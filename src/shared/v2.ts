import type { Role } from "../model";
import type { ChatAction, Turn } from "./contracts";
import type { Horizon } from "../zones";

export type ActiveContext = {
  role: Role;
  orderId?: string;
  zone?: string;
  horizon: Horizon;
};

export type Citation = {
  id: string;
  label: string;
  source: "FORGE" | "web" | "notion" | "enterprise";
  href?: string;
  detail?: string;
};

export type AuthorityRequirement = {
  authority: "finance" | "quality" | "program" | "procurement";
  reason: string;
};

export type ActionEnvelope = {
  actionId: string;
  actionType: string;
  preview: unknown;
  risk: "read" | "reversible" | "governed";
  requiredAuthorities: AuthorityRequirement[];
  expiresAt: string;
  status: "proposed" | "confirmed" | "rejected" | "executed" | "failed";
};

export type V2ChatMessage = {
  id: string;
  threadId: string;
  actor: "user" | "assistant" | "system";
  content: string;
  contextSnapshot: ActiveContext;
  citations: Citation[];
  actionEnvelope?: ActionEnvelope;
  createdAt: string;
};

export type ChatThreadRecord = {
  id: string;
  userId: string;
  messages: V2ChatMessage[];
  updatedAt: string;
};

export type TablePreference = {
  presetVersion: number;
  userId: string;
  role: Role;
  visibleColumns: string[];
  columnOrder: string[];
  widths: Record<string, number>;
  pinnedColumns: string[];
  sort: { key: string; direction: "asc" | "desc" }[];
};

export type DemandProjectionRow = {
  commitmentId: string;
  product: string;
  qty: number;
  requestedDate: string;
  promisedDate: string;
  capableDate: string | null;
  requestToPromiseDays: number;
  promiseToCapableDays: number | null;
  priority: string;
  status: string;
  riskState: "AT_RISK" | "WATCH" | "ON_TRACK";
  riskReason: string | null;
  active: boolean;
  pegged: number;
  workOrders: string[];
};

export type V2ChatRequest = {
  userId: string;
  text: string;
  context: ActiveContext;
  action?: ChatAction;
};

export type V2ChatResponse = {
  message: V2ChatMessage;
  mode: "scripted" | "ai" | "limited";
  turn?: Turn;
  limitations: string[];
};
