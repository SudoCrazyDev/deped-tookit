import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { zValidator } from "@hono/zod-validator";
import { HTTPException } from "hono/http-exception";
import type { Env } from "../types";
import { credentials, signupInput } from "../schema";
import { teachers, UniqueViolationError } from "../db";
import { hashPassword, verifyPassword } from "../lib/crypto";
import { verifyTurnstile } from "../lib/turnstile";
import {
  SESSION_COOKIE,
  clearSessionCookie,
  endSession,
  requireAuth,
  setSessionCookie,
  startSession,
} from "../middleware/auth";

export const auth = new Hono<Env>();

auth.post("/signup", zValidator("json", signupInput), async (c) => {
  const { email, password, contactNumber, fullName, school, turnstileToken } =
    c.req.valid("json");

  // Fail closed. A missing secret is a deployment mistake, and the safe reading
  // of it is "nobody gets in", not "everybody gets in without a bot check".
  if (!c.env.TURNSTILE_SECRET_KEY) {
    console.error("TURNSTILE_SECRET_KEY is not set — refusing signups");
    throw new HTTPException(503, {
      message: "Signup is temporarily unavailable. Please try again later.",
    });
  }

  const verdict = await verifyTurnstile(
    c.env.TURNSTILE_SECRET_KEY,
    turnstileToken,
    c.req.header("CF-Connecting-IP"),
  );

  if (!verdict.ok) {
    if (verdict.reason === "unavailable") {
      console.error("Turnstile siteverify unavailable:", verdict.codes.join(","));
      throw new HTTPException(503, {
        message: "Could not complete the human check. Please try again.",
      });
    }
    // The widget is reset on the client for both of these, so retrying works.
    throw new HTTPException(400, {
      message:
        verdict.reason === "expired"
          ? "That human check expired. Please try again."
          : "Human check failed. Please try again.",
    });
  }

  let teacher;
  try {
    teacher = await teachers.create(c.env.DB, {
      email: email.toLowerCase(),
      passwordHash: await hashPassword(password),
      contactNumber,
      fullName: fullName ?? null,
      school: school ?? null,
    });
  } catch (err) {
    if (err instanceof UniqueViolationError) {
      throw new HTTPException(409, { message: "That email is already registered" });
    }
    throw err;
  }

  const { cookie, maxAge } = await startSession(c.env.DB, c.env.SESSION_SECRET, teacher.id);
  setSessionCookie(c, cookie, maxAge);

  return c.json({ teacher }, 201);
});

auth.post("/login", zValidator("json", credentials), async (c) => {
  const { email, password } = c.req.valid("json");
  const found = await teachers.findByEmailWithHash(c.env.DB, email.toLowerCase());

  // Same message either way so the response can't be used to enumerate emails.
  const invalid = new HTTPException(401, { message: "Incorrect email or password" });
  if (!found) throw invalid;
  if (!(await verifyPassword(password, found.passwordHash))) throw invalid;

  const { cookie, maxAge } = await startSession(
    c.env.DB,
    c.env.SESSION_SECRET,
    found.teacher.id,
  );
  setSessionCookie(c, cookie, maxAge);

  return c.json({ teacher: found.teacher });
});

auth.post("/logout", async (c) => {
  await endSession(c.env.DB, c.env.SESSION_SECRET, getCookie(c, SESSION_COOKIE));
  clearSessionCookie(c);
  return c.body(null, 204);
});

auth.get("/me", requireAuth, (c) => c.json({ teacher: c.get("teacher") }));
