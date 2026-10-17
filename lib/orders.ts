import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { quote } from "./commerce";
export type Order = ReturnType<typeof quote> & {
  id: string;
  createdAt: string;
  status: "Demo order received";
};
const directory = process.env.ORDER_DATA_DIR || join(process.cwd(), ".data");
const file = join(directory, "orders.json");
let queue = Promise.resolve();
async function read(): Promise<Order[]> {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}
export async function save(order: Order) {
  const operation = queue.then(async () => {
    await mkdir(directory, { recursive: true });
    const orders = await read();
    orders.unshift(order);
    const temporary = `${file}.${crypto.randomUUID()}.tmp`;
    await writeFile(temporary, JSON.stringify(orders.slice(0, 500), null, 2));
    await rename(temporary, file);
  });
  queue = operation.catch(() => {});
  await operation;
}
export async function find(id: string) {
  await queue;
  return (await read()).find((order) => order.id === id);
}
