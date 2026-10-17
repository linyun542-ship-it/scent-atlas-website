import type { quote } from "./commerce.ts";
export const STATUSES = [
  "Demo order received",
  "Demo preparing",
  "Demo ready",
  "Demo completed",
  "Demo cancelled",
] as const;
export type Status = (typeof STATUSES)[number];
export type Order = ReturnType<typeof quote> & {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: Status;
  version: number;
};
export const NEXT: Record<Status, readonly Status[]> = {
  "Demo order received": ["Demo preparing", "Demo cancelled"],
  "Demo preparing": ["Demo ready", "Demo cancelled"],
  "Demo ready": ["Demo completed"],
  "Demo completed": [],
  "Demo cancelled": [],
};
export class Conflict extends Error {}
export function transition(
  order: Order,
  status: unknown,
  version: unknown,
): Order {
  if (!Number.isInteger(version) || version !== order.version)
    throw new Conflict("This order changed. Refresh before updating it.");
  if (!NEXT[order.status].includes(status as Status))
    throw new Conflict("That status transition is not allowed.");
  return {
    ...order,
    status: status as Status,
    version: order.version + 1,
    updatedAt: new Date().toISOString(),
  };
}
