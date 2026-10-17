import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { createOrder, find, updateOrder } from "../lib/orders.ts";
import { quote, type Product } from "../lib/commerce.ts";
const product: Product = {
  id: "test",
  brand: "House",
  name: "Sample",
  concentration: "EDP",
  family: "Fresh",
  priceCents: 650,
  color: "#aaa",
  source: "https://example.com",
};
test("idempotency, concurrent writes, lookup, transitions and stale updates", async () => {
  process.env.SUPABASE_URL = "";
  process.env.SUPABASE_PUBLISHABLE_KEY = "";
  process.env.SUPABASE_ANON_KEY = "";
  process.env.SUPABASE_ORDER_TOKEN = "";
  delete process.env.VERCEL;
  const directory = await mkdtemp(join(tmpdir(), "scent-orders-"));
  process.env.ORDER_DATA_DIR = directory;
  try {
    const data = quote(
      [product],
      [{ productId: "test", size: 2, quantity: 1 }],
    );
    const key = randomUUID();
    const orders = await Promise.all(
      Array.from({ length: 5 }, () => createOrder(data, key)),
    );
    assert.equal(new Set(orders.map((o) => o.id)).size, 1);
    await assert.rejects(() => createOrder({ ...data, totalCents: 1 }, key));
    assert.equal((await find(orders[0].id))?.totalCents, 1145);
    await assert.rejects(() => updateOrder(orders[0].id, "Demo completed", 0));
    const updated = await updateOrder(orders[0].id, "Demo preparing", 0);
    assert.equal(updated?.version, 1);
    await assert.rejects(() => updateOrder(orders[0].id, "Demo cancelled", 0));
    await updateOrder(orders[0].id, "Demo ready", 1);
    await updateOrder(orders[0].id, "Demo completed", 2);
    await assert.rejects(() => updateOrder(orders[0].id, "Demo preparing", 3));
    assert.equal((await find(orders[0].id))?.status, "Demo completed");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
