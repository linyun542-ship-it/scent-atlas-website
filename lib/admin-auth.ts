import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
export const COOKIE = "scent_atlas_admin";
const attempts = new Map<string, { count: number; until: number }>();
function equal(a: string, b: string) {
  return timingSafeEqual(
    createHash("sha256").update(a).digest(),
    createHash("sha256").update(b).digest(),
  );
}
function settings() {
  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (url && key) return { url: url.replace(/\/$/, ""), key };
  if (url || key || process.env.VERCEL)
    throw new Error("Supabase admin authentication is not configured.");
  return null;
}
function localSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (
    !secret ||
    secret.length < 32 ||
    !process.env.ADMIN_EMAIL ||
    !process.env.ADMIN_PASSWORD
  )
    throw new Error("Local admin credentials are not configured.");
  return secret;
}
export async function isAdmin(token: string): Promise<boolean> {
  const c = settings();
  if (c) {
    const response = await fetch(`${c.url}/auth/v1/user`, {
      headers: { apikey: c.key, Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return false;
    const user = await response.json();
    return user.app_metadata?.role === "admin";
  }
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  if (
    !equal(
      createHmac("sha256", localSecret()).update(payload).digest("base64url"),
      signature,
    )
  )
    return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return data.role === "admin" && data.expires > Date.now();
  } catch {
    return false;
  }
}
export async function login(email: string, password: string, source: string) {
  for (const [key, value] of attempts)
    if (value.until < Date.now()) attempts.delete(key);
  const prior = attempts.get(source) ?? {
    count: 0,
    until: Date.now() + 15 * 60 * 1000,
  };
  if (prior.count >= 8)
    throw new Error("Too many login attempts. Please try later.");
  prior.count += 1;
  attempts.set(source, prior);
  const c = settings();
  if (c) {
    const response = await fetch(`${c.url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: c.key, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (!data.access_token || !(await isAdmin(data.access_token))) return null;
    attempts.delete(source);
    return {
      token: data.access_token as string,
      seconds: Math.min(data.expires_in || 3600, 3600),
    };
  }
  const secret = localSecret();
  if (
    !equal(email, process.env.ADMIN_EMAIL!) ||
    !equal(password, process.env.ADMIN_PASSWORD!)
  )
    return null;
  attempts.delete(source);
  const payload = Buffer.from(
    JSON.stringify({ role: "admin", expires: Date.now() + 3600000 }),
  ).toString("base64url");
  return {
    token: `${payload}.${createHmac("sha256", secret).update(payload).digest("base64url")}`,
    seconds: 3600,
  };
}
export async function authorize(request: NextRequest) {
  const token = request.cookies.get(COOKIE)?.value;
  return token ? isAdmin(token) : false;
}
