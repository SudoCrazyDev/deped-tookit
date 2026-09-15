import type { Database } from "../db/database";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { HTTPException } from "hono/http-exception";
import type { Env } from "../types";
import { assessmentInput, quarterParam, scoresInput } from "../schema";
import { requireAuth } from "../middleware/auth";
import { assessments as assessmentsDb, sections as sectionsDb } from "../db";

export const assessments = new Hono<Env>();
assessments.use("*", requireAuth);

/** Confirms the class belongs to the signed-in teacher before reading or writing. */
async function assertOwnsSection(db: Database, sectionId: string, teacherId: string) {
  if (!(await sectionsDb.belongsToTeacher(db, sectionId, teacherId))) {
    throw new HTTPException(404, { message: "Class not found" });
  }
}

assessments.get("/sections/:sectionId/assessments", async (c) => {
  const sectionId = c.req.param("sectionId");
  await assertOwnsSection(c.env.DB, sectionId, c.get("teacher").id);

  const raw = c.req.query("quarter");
  let quarter: number | undefined;
  if (raw !== undefined) {
    const parsed = quarterParam.safeParse(raw);
    if (!parsed.success) throw new HTTPException(400, { message: "Quarter must be 1-4" });
    quarter = parsed.data;
  }

  const found = await assessmentsDb.listForSection(c.env.DB, sectionId, quarter);
  return c.json({ assessments: found });
});

assessments.post(
  "/sections/:sectionId/assessments",
  zValidator("json", assessmentInput),
  async (c) => {
    const sectionId = c.req.param("sectionId");
    await assertOwnsSection(c.env.DB, sectionId, c.get("teacher").id);

    const assessment = await assessmentsDb.create(c.env.DB, sectionId, c.req.valid("json"));
    return c.json({ assessment }, 201);
  },
);

/** Saves a whole column of the class record at once. */
assessments.put(
  "/assessments/:assessmentId/scores",
  zValidator("json", scoresInput),
  async (c) => {
    // This lookup authorizes as well as reads: it only matches an assessment
    // inside a class the signed-in teacher owns.
    const assessment = await assessmentsDb.findForTeacher(
      c.env.DB,
      c.req.param("assessmentId"),
      c.get("teacher").id,
    );
    if (!assessment) throw new HTTPException(404, { message: "Assessment not found" });

    const { scores } = c.req.valid("json");
    const over = scores.find(
      (s) => s.rawScore !== null && s.rawScore > assessment.highestPossibleScore,
    );
    if (over) {
      throw new HTTPException(422, {
        message: `Score ${over.rawScore} exceeds the highest possible score of ${assessment.highestPossibleScore}`,
      });
    }

    const saved = await assessmentsDb.upsertScores(c.env.DB, assessment.id, scores);
    return c.json({ saved });
  },
);
