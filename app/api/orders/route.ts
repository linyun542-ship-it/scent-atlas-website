import { NextRequest, NextResponse } from "next/server";
import catalog from "../../../lib/catalog.json";
import { quote } from "../../../lib/commerce";
import { createOrder, find } from "../../../lib/orders";
import { Conflict } from "../../../lib/order-model";
import { UUID, body, sameOrigin } from "../../../lib/http";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  if (!sameOrigin(request))
    return NextResponse.json(
      { error: "Request origin is not allowed." },
      { status: 403 },
    );
  let result;
  let key;
  try {
    const input = await body(request);
    result = quote(catalog, input.items);
    key = input.checkoutKey;
    if (typeof key !== "string" || !UUID.test(key))
      throw new Error("A valid checkout reference is required.");
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid bag." },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json(await createOrder(result, key), {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Conflict
            ? error.message
            : "Demo ordering is temporarily unavailable. Please retry shortly.",
      },
      { status: error instanceof Conflict ? 409 : 503 },
    );
  }
}
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!UUID.test(id))
    return NextResponse.json(
      { error: "Enter the full order reference from your receipt." },
      { status: 400 },
    );
  try {
    const order = await find(id);
    return order
      ? NextResponse.json(order, { headers: { "Cache-Control": "no-store" } })
      : NextResponse.json(
          { error: "No demo order found for this reference." },
          { status: 404 },
        );
  } catch {
    return NextResponse.json(
      { error: "Order lookup is temporarily unavailable." },
      { status: 503 },
    );
  }
}
