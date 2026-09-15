import type { Database } from "../db/database";
import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import type { Env } from "../types";
import { teachers } from "../db";
import { signSessionId, verifySessionCookie } from "../lib/crypto";

export const SESSION_COOKIE = "dtk_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export async function startSession(
  db: Database,
  secret: string,
  teacherId: string,
): Promise<{ cookie: string; maxAge: number }> {
  const sessionId = await teachers.createSession(db, teacherId, SESSION_TTL_SECONDS);
  return { cookie: await signSessionId(sessionId, secret), maxAge: SESSION_TTL_SECONDS };
}

export function setSessionCookie(c: Context<Env>, value: string, maxAge: number) {
  setCookie(c, SESSION_COOKIE, value, {
    httpOnly: true,
    // Local wrangler serves over http, where a Secure cookie would be dropped.
    secure: new URL(c.req.url).protocol === "https:",
    sameSite: "Lax",
    path: "/",
    maxAge,
  });
}

export function clearSessionCookie(c: Context<Env>) {
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
}

export async function endSession(db: Database, secret: string, cookie: string | undefined) {
  if (!cookie) return;
  const sessionId = await verifySessionCookie(cookie, secret);
  if (sessionId) await teachers.deleteSession(db, sessionId);
}

/** Rejects the request unless a valid, unexpired session cookie is present. */
export const requireAuth = createMiddleware<Env>(async (c, next) => {
  const cookie = getCookie(c, SESSION_COOKIE);
  if (!cookie) throw new HTTPException(401, { message: "Not signed in" });

  const sessionId = await verifySessionCookie(cookie, c.env.SESSION_SECRET);
  if (!sessionId) throw new HTTPException(401, { message: "Invalid session" });

  const teacher = await teachers.findBySession(c.env.DB, sessionId);
  if (!teacher) throw new HTTPException(401, { message: "Session expired" });

  c.set("teacher", teacher);
  await next();
});
