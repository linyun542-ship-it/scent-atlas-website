import { NextRequest, NextResponse } from "next/server";
import { authorize } from "../../../../lib/admin-auth";
import { body, sameOrigin, UUID } from "../../../../lib/http";
import { listOrders, updateOrder } from "../../../../lib/orders";
import { Conflict } from "../../../../lib/order-model";
export async function GET(request: NextRequest) {
  try {
    if (!(await authorize(request)))
      return NextResponse.json(
        { error: "Administrator sign-in required." },
        { status: 401 },
      );
    return NextResponse.json(
      { orders: await listOrders() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Order administration is temporarily unavailable." },
      { status: 503 },
    );
  }
}
export async function PATCH(request: NextRequest) {
  if (!sameOrigin(request))
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 },
    );
  try {
    if (!(await authorize(request)))
      return NextResponse.json(
        { error: "Administrator sign-in required." },
        { status: 401 },
      );
  } catch {
    return NextResponse.json(
      { error: "Administrator authentication is unavailable." },
      { status: 503 },
    );
  }
  let input;
  try {
    input = await body(request, 4096);
    if (typeof input.id !== "string" || !UUID.test(input.id)) throw new Error();
  } catch {
    return NextResponse.json(
      { error: "A valid order reference is required." },
      { status: 400 },
    );
  }
  try {
    const order = await updateOrder(input.id, input.status, input.version);
    return order
      ? NextResponse.json({ order })
      : NextResponse.json({ error: "Order not found." }, { status: 404 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Conflict
            ? error.message
            : "Could not update this order.",
      },
      { status: error instanceof Conflict ? 409 : 503 },
    );
  }
}
