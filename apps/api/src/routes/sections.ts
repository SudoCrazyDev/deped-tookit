import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { HTTPException } from "hono/http-exception";
import type { Env } from "../types";
import { sectionInput, studentInput } from "../schema";
import { requireAuth } from "../middleware/auth";
import { sections as sectionsDb, students as studentsDb, UniqueViolationError } from "../db";

export const sections = new Hono<Env>();
sections.use("*", requireAuth);

sections.get("/", async (c) => {
  const found = await sectionsDb.listForTeacher(c.env.DB, c.get("teacher").id);
  return c.json({ sections: found });
});

sections.post("/", zValidator("json", sectionInput), async (c) => {
  const section = await sectionsDb.create(c.env.DB, c.get("teacher").id, c.req.valid("json"));
  return c.json({ section }, 201);
});

sections.get("/:sectionId", async (c) => {
  const sectionId = c.req.param("sectionId");

  const section = await sectionsDb.findWithCount(c.env.DB, sectionId, c.get("teacher").id);
  if (!section) throw new HTTPException(404, { message: "Class not found" });

  const students = await studentsDb.listInSection(c.env.DB, sectionId);
  return c.json({ section, students });
});

sections.delete("/:sectionId", async (c) => {
  const archived = await sectionsDb.archive(
    c.env.DB,
    c.req.param("sectionId"),
    c.get("teacher").id,
  );

  if (!archived) throw new HTTPException(404, { message: "Class not found" });
  return c.body(null, 204);
});

/** Creates a learner and enrols them in this class in one step. */
sections.post("/:sectionId/students", zValidator("json", studentInput), async (c) => {
  const teacherId = c.get("teacher").id;
  const sectionId = c.req.param("sectionId");

  if (!(await sectionsDb.belongsToTeacher(c.env.DB, sectionId, teacherId))) {
    throw new HTTPException(404, { message: "Class not found" });
  }

  try {
    const student = await studentsDb.createAndEnroll(
      c.env.DB,
      teacherId,
      sectionId,
      c.req.valid("json"),
    );
    return c.json({ student }, 201);
  } catch (err) {
    if (err instanceof UniqueViolationError) {
      throw new HTTPException(409, { message: "A learner with that LRN already exists" });
    }
    throw err;
  }
});
