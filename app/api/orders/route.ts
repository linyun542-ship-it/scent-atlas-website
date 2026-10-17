import { NextRequest, NextResponse } from "next/server";
import catalog from "../../../lib/catalog.json";
import { quote } from "../../../lib/commerce";
import { find, save } from "../../../lib/orders";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      const parsed = new URL(origin);
      if (
        parsed.host !== request.headers.get("host") ||
        parsed.protocol !== request.nextUrl.protocol
      )
        throw new Error("Origin mismatch");
    } catch {
      return NextResponse.json(
        { error: "Request origin is not allowed." },
        { status: 403 },
      );
    }
  }
  let result;
  try {
    const text = await request.text();
    if (text.length > 16000) throw new Error("Bag request is too large.");
    result = quote(catalog, JSON.parse(text).items);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid bag." },
      { status: 400 },
    );
  }
  try {
    const order = {
      ...result,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      status: "Demo order received" as const,
    };
    await save(order);
    return NextResponse.json(order, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Could not save this demo order. Please try again." },
      { status: 503 },
    );
  }
}
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    )
  )
    return NextResponse.json(
      { error: "Enter the full order reference from your receipt." },
      { status: 400 },
    );
  try {
    const order = await find(id);
    if (!order)
      return NextResponse.json(
        { error: "No demo order found for this reference." },
        { status: 404 },
      );
    return NextResponse.json(order, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Order lookup is temporarily unavailable." },
      { status: 503 },
    );
  }
}
