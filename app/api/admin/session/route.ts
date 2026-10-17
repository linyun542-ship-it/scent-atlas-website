import { NextRequest, NextResponse } from "next/server";
import { authorize, COOKIE, login } from "../../../../lib/admin-auth";
import { body, sameOrigin } from "../../../../lib/http";
export async function POST(request: NextRequest) {
  if (!sameOrigin(request))
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 },
    );
  let input;
  try {
    input = await body(request, 4096);
    if (typeof input.email !== "string" || typeof input.password !== "string")
      throw new Error();
  } catch {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 },
    );
  }
  try {
    const session = await login(
      input.email,
      input.password,
      request.headers.get("x-forwarded-for")?.split(",")[0] || "local",
    );
    if (!session)
      return NextResponse.json(
        { error: "Invalid credentials or administrator access not granted." },
        { status: 401 },
      );
    const response = NextResponse.json({ authenticated: true });
    response.cookies.set(COOKIE, session.token, {
      httpOnly: true,
      sameSite: "strict",
      secure: !!process.env.VERCEL || request.nextUrl.protocol === "https:",
      path: "/api/admin",
      maxAge: session.seconds,
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    return NextResponse.json(
      {
        error:
          "Administrator login is unavailable or temporarily rate limited.",
      },
      { status: 503 },
    );
  }
}
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json(
      { authenticated: await authorize(request) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 503 });
  }
}
export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request))
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 },
    );
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(COOKIE, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: !!process.env.VERCEL || request.nextUrl.protocol === "https:",
    path: "/api/admin",
    maxAge: 0,
  });
  return response;
}
