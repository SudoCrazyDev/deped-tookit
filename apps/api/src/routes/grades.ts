import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { Env } from "../types";
import { requireAuth } from "../middleware/auth";
import { quarterParam } from "../schema";
import { grades as gradesDb, sections as sectionsDb } from "../db";
import { computeQuarterlyGrade, descriptorFor } from "../lib/grading";

export const grades = new Hono<Env>();
grades.use("*", requireAuth);

/**
 * Quarterly grades for every learner in a class.
 *
 * `?missing=ignore` (the default) grades only the work recorded so far.
 * `?missing=zero` counts every assessment in the class record, which is what
 * you want once the quarter is closed.
 */
grades.get("/sections/:sectionId/quarters/:quarter/grades", async (c) => {
  const teacherId = c.get("teacher").id;
  const sectionId = c.req.param("sectionId");

  const parsedQuarter = quarterParam.safeParse(c.req.param("quarter"));
  if (!parsedQuarter.success) throw new HTTPException(400, { message: "Quarter must be 1-4" });
  const quarter = parsedQuarter.data;

  const missing = c.req.query("missing") === "zero" ? "zero" : "ignore";

  const section = await sectionsDb.find(c.env.DB, sectionId, teacherId);
  if (!section) throw new HTTPException(404, { message: "Class not found" });

  const totals = await gradesDb.componentTotals(c.env.DB, sectionId, quarter, missing);

  const learners = totals.map((learner) => {
    const breakdown = computeQuarterlyGrade(section.weightProfile, learner.totals);
    return {
      studentId: learner.studentId,
      name: `${learner.lastName}, ${learner.firstName}${
        learner.middleName ? ` ${learner.middleName}` : ""
      }`,
      ...breakdown,
      descriptor: descriptorFor(breakdown.quarterlyGrade),
    };
  });

  return c.json({ section, quarter, missing, learners });
});
