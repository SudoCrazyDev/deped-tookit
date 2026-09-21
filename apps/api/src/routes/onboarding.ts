import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { HTTPException } from "hono/http-exception";
import type { Env } from "../types";
import { onboardingInput } from "../schema";
import { requireAuth } from "../middleware/auth";
import { teachers as teachersDb, UniqueViolationError } from "../db";

export const onboarding = new Hono<Env>();
onboarding.use("*", requireAuth);

/** The teacher's advisory classes. Empty for a floating teacher. */
onboarding.get("/advisories", async (c) => {
  const advisories = await teachersDb.listAdvisories(c.env.DB, c.get("teacher").id);
  return c.json({ advisories });
});

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
  let teacher;
  try {
    teacher = await teachersDb.completeOnboarding(
      c.env.DB,
      c.get("teacher").id,
      c.req.valid("json"),
    );
  } catch (err) {
    // The schema already rejects a repeated section, so reaching the unique
    // index means two requests raced. Say what is wrong rather than 500.
    if (err instanceof UniqueViolationError) {
      throw new HTTPException(409, {
        message: "That section is listed twice. Remove the duplicate and try again.",
      });
    }
    throw err;
  }

  // requireAuth just loaded this teacher, so a miss means the row went away
  // mid-request — a deleted account, not a bad request.
  if (!teacher) throw new HTTPException(404, { message: "Account not found" });

  return c.json({ teacher });
});

/**
 * Clears the wizard's answers so the teacher can walk it again.
 *
 * Deliberately destructive and deliberately not undoable: the alternative —
 * keeping the old answers around to restore — is a second version of the
 * profile for every screen to think about, for a button pressed once in a
 * blue moon. The client confirms before calling this.
 */
onboarding.delete("/", async (c) => {
  const teacher = await teachersDb.resetOnboarding(c.env.DB, c.get("teacher").id);
  if (!teacher) throw new HTTPException(404, { message: "Account not found" });

  return c.json({ teacher });
});
