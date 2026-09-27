import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { apiHandler } from "./app";
import { DEFAULT_COLUMNS, defaultTablePreference } from "../src/features/preferences/useTablePreferences";

const server = createServer((req, res) => void apiHandler(req, res));
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address() as AddressInfo;
const base = `http://127.0.0.1:${address.port}`;

try {
  assert.deepEqual(DEFAULT_COLUMNS, ["promised", "commitmentId", "product", "qty", "constraint", "risk"]);

  const ordersResponse = await fetch(`${base}/api/v2/orders`);
  assert.equal(ordersResponse.status, 200);
  const orders = (await ordersResponse.json()) as { orders: { commitmentId: string }[] };
  assert.deepEqual(orders.orders.map((row) => row.commitmentId).sort(), ["COM-0991", "COM-1018", "COM-1042", "COM-1104"]);

  const detailResponse = await fetch(`${base}/api/v2/orders/COM-1042/details`);
  const detail = (await detailResponse.json()) as { order: { constraint: { label: string }; qty: number } };
  assert.equal(detail.order.qty, 120);
  assert.equal(detail.order.constraint.label, "Leak-test capacity");

  const preference = defaultTablePreference("manufacturing-manager");
  const putPreference = await fetch(`${base}/api/v2/preferences/table/manufacturing-manager?userId=local-user`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(preference),
  });
  assert.equal(putPreference.status, 200);
  const getPreference = await fetch(`${base}/api/v2/preferences/table/manufacturing-manager?userId=local-user`);
  const stored = (await getPreference.json()) as { preference: typeof preference };
  assert.deepEqual(stored.preference.visibleColumns, DEFAULT_COLUMNS);

  const chatResponse = await fetch(`${base}/api/v2/chat/messages`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      userId: "verify-user",
      text: "Explain the current status",
      context: { role: "manufacturing-manager", orderId: "COM-1042", horizon: 13 },
    }),
  });
  assert.equal(chatResponse.status, 200);
  const chat = (await chatResponse.json()) as { message: { content: string; contextSnapshot: { orderId: string } } };
  assert.equal(chat.message.contextSnapshot.orderId, "COM-1042");
  assert.ok(chat.message.content.length > 20);

  const threadResponse = await fetch(`${base}/api/v2/chat/thread?userId=verify-user`);
  const thread = (await threadResponse.json()) as { messages: unknown[] };
  assert.equal(thread.messages.length, 2);

  const unsafeConfirmation = await fetch(`${base}/api/v2/chat/confirmations/not-issued`, { method: "POST" });
  assert.equal(unsafeConfirmation.status, 409);

  await fetch(`${base}/api/v2/chat/thread?userId=verify-user`, { method: "DELETE" });
  console.log("v2 api, persistence and safe-confirmation contracts verified");
} finally {
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}
