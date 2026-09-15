import type { Database } from "./database";
import type { Section, SectionWithCount } from "../types";
import type { WeightProfile } from "../lib/grading";
import {
  toSection,
  toSectionWithCount,
  type SectionRow,
  type SectionWithCountRow,
} from "./mappers";

const SELECT_WITH_COUNT = `
  SELECT s.id, s.name, s.grade_level, s.subject, s.school_year, s.weight_profile,
         COUNT(e.student_id) FILTER (WHERE e.dropped_at IS NULL) AS student_count
    FROM sections s
    LEFT JOIN enrollments e ON e.section_id = s.id`;

export async function listForTeacher(
  db: Database,
  teacherId: string,
): Promise<SectionWithCount[]> {
  const { results } = await db
    .prepare(
      `${SELECT_WITH_COUNT}
        WHERE s.teacher_id = ? AND s.archived_at IS NULL
        GROUP BY s.id
        ORDER BY s.grade_level, s.name`,
    )
    .bind(teacherId)
    .all<SectionWithCountRow>();

  return results.map(toSectionWithCount);
}

export async function findWithCount(
  db: Database,
  sectionId: string,
  teacherId: string,
): Promise<SectionWithCount | null> {
  const row = await db
    .prepare(`${SELECT_WITH_COUNT} WHERE s.id = ? AND s.teacher_id = ? GROUP BY s.id`)
    .bind(sectionId, teacherId)
    .first<SectionWithCountRow>();

  return row ? toSectionWithCount(row) : null;
}

export async function find(
  db: Database,
  sectionId: string,
  teacherId: string,
): Promise<Section | null> {
  const row = await db
    .prepare(
      `SELECT id, name, grade_level, subject, school_year, weight_profile
         FROM sections WHERE id = ? AND teacher_id = ?`,
    )
    .bind(sectionId, teacherId)
    .first<SectionRow>();

  return row ? toSection(row) : null;
}

/** Cheap ownership check for routes that only need to authorize, not read. */
export async function belongsToTeacher(
  db: Database,
  sectionId: string,
  teacherId: string,
): Promise<boolean> {
  const row = await db
    .prepare("SELECT 1 FROM sections WHERE id = ? AND teacher_id = ?")
    .bind(sectionId, teacherId)
    .first();

  return row !== null;
}

export async function create(
  db: Database,
  teacherId: string,
  input: {
    name: string;
    gradeLevel: number;
    subject: string;
    schoolYear: string;
    weightProfile: WeightProfile;
  },
): Promise<SectionWithCount> {
  const id = crypto.randomUUID();

  await db
    .prepare(
      `INSERT INTO sections
         (id, teacher_id, name, grade_level, subject, school_year, weight_profile)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      teacherId,
      input.name,
      input.gradeLevel,
      input.subject,
      input.schoolYear,
      input.weightProfile,
    )
    .run();

  return { id, ...input, studentCount: 0 };
}

/**
 * Archives rather than deletes: a teacher who hides last year's class still
 * needs its grades if a records request comes in. Returns false if the class
 * does not exist or belongs to someone else.
 */
export async function archive(
  db: Database,
  sectionId: string,
  teacherId: string,
): Promise<boolean> {
  const { meta } = await db
    .prepare("UPDATE sections SET archived_at = unixepoch() WHERE id = ? AND teacher_id = ?")
    .bind(sectionId, teacherId)
    .run();

  return meta.changes > 0;
}
