import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { Conflict, transition, type Order } from "./order-model.ts";
import type { quote } from "./commerce.ts";
export type { Order } from "./order-model.ts";
type RecordRow = {
  id: string;
  idempotency_key: string;
  request_hash: string;
  payload: Order;
  version: number;
  status: string;
};
let queue = Promise.resolve();
function config() {
  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  const token = process.env.SUPABASE_ORDER_TOKEN;
  if (url && key && token) return { url: url.replace(/\/$/, ""), key, token };
  if (url || key || token || process.env.VERCEL)
    throw new Error("Cloud order storage is not configured.");
  return null;
}
async function rpc(name: string, args: Record<string, unknown>) {
  const c = config();
  if (!c) throw new Error("Supabase storage is not configured.");
  const response = await fetch(`${c.url}/rest/v1/rpc/${name}`, {
    method: "POST",
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
    headers: { apikey: c.key, "Content-Type": "application/json" },
    body: JSON.stringify({ p_token: c.token, ...args }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    if (["23505", "40001"].includes(error.code))
      throw new Conflict(
        "Checkout or order state changed. Refresh before retrying.",
      );
    throw new Error("Cloud order operation failed.");
  }
  return response.json();
}
function file() {
  return join(
    process.env.ORDER_DATA_DIR || join(process.cwd(), ".data"),
    "orders.json",
  );
}
async function read(): Promise<RecordRow[]> {
  try {
    const rows = JSON.parse(await readFile(file(), "utf8"));
    return rows.map((r: RecordRow | Order) =>
      "payload" in r
        ? r
        : {
            id: r.id,
            idempotency_key: r.id,
            request_hash: "",
            status: r.status,
            version: 0,
            payload: { ...r, updatedAt: r.createdAt, version: 0 },
          },
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}
async function write(rows: RecordRow[]) {
  await mkdir(process.env.ORDER_DATA_DIR || join(process.cwd(), ".data"), {
    recursive: true,
  });
  const temporary = `${file()}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(rows, null, 2));
  await rename(temporary, file());
}
function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const task = queue.then(operation);
  queue = task.then(
    () => {},
    () => {},
  );
  return task;
}
export async function createOrder(
  data: ReturnType<typeof quote>,
  key: string,
): Promise<Order> {
  const hash = createHash("sha256").update(JSON.stringify(data)).digest("hex");
  const now = new Date().toISOString();
  const order: Order = {
    ...data,
    id: randomUUID(),
    status: "Demo order received",
    createdAt: now,
    updatedAt: now,
    version: 0,
  };
  const row: RecordRow = {
    id: order.id,
    idempotency_key: key,
    request_hash: hash,
    status: order.status,
    version: 0,
    payload: order,
  };
  if (config()) return rpc("create_scent_order", { p_row: row });
  return serialize(async () => {
    const rows = await read();
    const prior = rows.find((r) => r.idempotency_key === key);
    if (prior) {
      if (prior.request_hash !== hash)
        throw new Conflict(
          "This checkout reference was already used for a different bag.",
        );
      return prior.payload;
    }
    if (rows.length >= 10000)
      throw new Error("Local demo order capacity reached.");
    await write([row, ...rows]);
    return order;
  });
}
export async function find(id: string): Promise<Order | undefined> {
  if (config())
    return (await rpc("find_scent_order", { p_id: id })) ?? undefined;
  await queue;
  return (await read()).find((r) => r.id === id)?.payload;
}
export async function listOrders(): Promise<Order[]> {
  if (config()) return rpc("list_scent_orders", {});
  await queue;
  return (await read()).slice(0, 100).map((r) => r.payload);
}
export async function updateOrder(
  id: string,
  status: unknown,
  version: unknown,
): Promise<Order | undefined> {
  if (config()) {
    const prior = await find(id);
    if (!prior) return;
    const next = transition(prior, status, version);
    return rpc("update_scent_order", {
      p_id: id,
      p_expected: prior.version,
      p_order: next,
    });
  }
  return serialize(async () => {
    const rows = await read();
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    const next = transition(row.payload, status, version);
    row.payload = next;
    row.version = next.version;
    row.status = next.status;
    await write(rows);
    return next;
  });
}
