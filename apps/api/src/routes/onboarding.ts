import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { HTTPException } from "hono/http-exception";
import type { Env } from "../types";
import { onboardingInput } from "../schema";
import { requireAuth } from "../middleware/auth";
import { teachers as teachersDb } from "../db";

export const onboarding = new Hono<Env>();
onboarding.use("*", requireAuth);

/**
 * Saves the whole wizard in one request.
 *
 * The client walks four steps, but only posts here once, at the end: a
 * per-step save would leave teachers who close the tab halfway in a state the
 * app then has to reason about, and the wizard is short enough that holding
 * the answers in the browser until the last step costs nothing.
 *
 * Re-postable on purpose — it is a plain overwrite, so the same endpoint can
 * back an "edit school details" screen later without changing.
 */
onboarding.post("/", zValidator("json", onboardingInput), async (c) => {
  const teacher = await teachersDb.completeOnboarding(
    c.env.DB,
    c.get("teacher").id,
    c.req.valid("json"),
  );

  // requireAuth just loaded this teacher, so a miss means the row went away
  // mid-request — a deleted account, not a bad request.
  if (!teacher) throw new HTTPException(404, { message: "Account not found" });

  return c.json({ teacher });
});
