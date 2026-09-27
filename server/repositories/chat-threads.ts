import { randomUUID } from "node:crypto";
import type { ActiveContext, ChatThreadRecord, V2ChatMessage } from "../../src/shared/v2";
import { readStore, writeStore } from "./json-store";

type ThreadStore = Record<string, ChatThreadRecord>;
const FILE = "chat/threads.json";

export function getChatThread(userId: string): ChatThreadRecord {
  const store = readStore<ThreadStore>(FILE, {});
  return store[userId] ?? { id: `thread-${randomUUID()}`, userId, messages: [], updatedAt: new Date().toISOString() };
}

export function appendChatMessage(
  userId: string,
  actor: V2ChatMessage["actor"],
  content: string,
  contextSnapshot: ActiveContext,
  extras: Pick<V2ChatMessage, "citations"> & Partial<Pick<V2ChatMessage, "actionEnvelope">>,
): V2ChatMessage {
  const store = readStore<ThreadStore>(FILE, {});
  const thread = store[userId] ?? getChatThread(userId);
  const message: V2ChatMessage = {
    id: `message-${randomUUID()}`,
    threadId: thread.id,
    actor,
    content,
    contextSnapshot,
    citations: extras.citations,
    ...(extras.actionEnvelope ? { actionEnvelope: extras.actionEnvelope } : {}),
    createdAt: new Date().toISOString(),
  };
  thread.messages.push(message);
  thread.updatedAt = message.createdAt;
  store[userId] = thread;
  writeStore(FILE, store);
  return message;
}

export function clearChatThread(userId: string): ChatThreadRecord {
  const store = readStore<ThreadStore>(FILE, {});
  const thread: ChatThreadRecord = {
    id: `thread-${randomUUID()}`,
    userId,
    messages: [],
    updatedAt: new Date().toISOString(),
  };
  store[userId] = thread;
  writeStore(FILE, store);
  return thread;
}
