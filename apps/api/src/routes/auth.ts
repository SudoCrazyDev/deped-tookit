import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { zValidator } from "@hono/zod-validator";
import { HTTPException } from "hono/http-exception";
import type { Env } from "../types";
import { credentials, signupInput } from "../schema";
import { teachers, UniqueViolationError } from "../db";
import { hashPassword, verifyPassword } from "../lib/crypto";
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
  const { email, password, fullName, school } = c.req.valid("json");

  let teacher;
  try {
    teacher = await teachers.create(c.env.DB, {
      email: email.toLowerCase(),
      passwordHash: await hashPassword(password),
      fullName,
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
