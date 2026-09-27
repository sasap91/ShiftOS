import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { apiHandler } from "./app";
import { DEFAULT_COLUMNS, ROLE_DEFAULT_COLUMNS, TABLE_PRESET_VERSION, defaultTablePreference } from "../src/features/preferences/useTablePreferences";

const server = createServer((req, res) => void apiHandler(req, res));
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address() as AddressInfo;
const base = `http://127.0.0.1:${address.port}`;

try {
  assert.deepEqual(DEFAULT_COLUMNS, ["promised", "commitmentId", "product", "qty", "constraint", "risk"]);
  assert.deepEqual(defaultTablePreference("manufacturing-manager").visibleColumns, ROLE_DEFAULT_COLUMNS["manufacturing-manager"]);
  assert.deepEqual(defaultTablePreference("shift-planner").visibleColumns, ROLE_DEFAULT_COLUMNS["shift-planner"]);
  assert.deepEqual(defaultTablePreference("maintenance-manager").visibleColumns, ROLE_DEFAULT_COLUMNS["maintenance-manager"]);
  assert.equal(defaultTablePreference("manufacturing-manager").presetVersion, TABLE_PRESET_VERSION);

  const ordersResponse = await fetch(`${base}/api/v2/orders`);
  assert.equal(ordersResponse.status, 200);
  const orders = (await ordersResponse.json()) as { orders: { commitmentId: string; operational: { workCenter: string; loadGap: number; assetImpactQty: number; recovery: string } }[] };
  assert.deepEqual(orders.orders.map((row) => row.commitmentId).sort(), ["COM-0991", "COM-1018", "COM-1042", "COM-1104"]);
  const order1042 = orders.orders.find((row) => row.commitmentId === "COM-1042");
  const order1018 = orders.orders.find((row) => row.commitmentId === "COM-1018");
  const order1104 = orders.orders.find((row) => row.commitmentId === "COM-1104");
  assert.equal(order1042?.operational.loadGap, 64);
  assert.equal(order1042?.operational.assetImpactQty, 64);
  assert.equal(order1042?.operational.recovery, "14 October 22:00");
  assert.equal(order1018?.operational.loadGap, 0);
  assert.equal(order1018?.operational.assetImpactQty, 0);
  assert.equal(order1104?.operational.workCenter, "RES-LT-01");
  assert.equal(order1104?.operational.loadGap, 0);

  const demandResponse = await fetch(`${base}/api/v2/demand`);
  assert.equal(demandResponse.status, 200);
  const demand = (await demandResponse.json()) as { demand: { commitmentId: string; product: string; qty: number; riskState: string }[] };
  assert.equal(demand.demand.length, 60);
  const demand52 = demand.demand.find((row) => row.commitmentId === "COM-0052");
  assert.equal(demand52?.product, "CFG-RM-03");
  assert.equal(demand52?.qty, 12);
  assert.equal(demand52?.riskState, "AT_RISK");

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
  assert.deepEqual(stored.preference.visibleColumns, ROLE_DEFAULT_COLUMNS["manufacturing-manager"]);

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
