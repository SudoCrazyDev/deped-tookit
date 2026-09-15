import type { Database } from "./database";
import type { Assessment, AssessmentComponent } from "../types";
import { toAssessment, type AssessmentRow } from "./mappers";

const SELECT_COLUMNS =
  "id, section_id, quarter, component, title, highest_possible_score, position";
const ORDER = " ORDER BY quarter, component, position, created_at";

export async function listForSection(
  db: Database,
  sectionId: string,
  quarter?: number,
): Promise<Assessment[]> {
  const base = `SELECT ${SELECT_COLUMNS} FROM assessments WHERE section_id = ?`;

  const stmt =
    quarter === undefined
      ? db.prepare(`${base}${ORDER}`).bind(sectionId)
      : db.prepare(`${base} AND quarter = ?${ORDER}`).bind(sectionId, quarter);

  const { results } = await stmt.all<AssessmentRow>();
  return results.map(toAssessment);
}

export async function create(
  db: Database,
  sectionId: string,
  input: {
    quarter: number;
    component: AssessmentComponent;
    title: string;
    highestPossibleScore: number;
    position: number;
  },
): Promise<Assessment> {
  const id = crypto.randomUUID();

  await db
    .prepare(
      `INSERT INTO assessments
         (id, section_id, quarter, component, title, highest_possible_score, position)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      sectionId,
      input.quarter,
      input.component,
      input.title,
      input.highestPossibleScore,
      input.position,
    )
    .run();

  return { id, sectionId, ...input };
}

/**
 * Looks up an assessment only if it sits in a class the teacher owns, so score
 * writes are authorized by the same query that fetches the row.
 */
export async function findForTeacher(
  db: Database,
  assessmentId: string,
  teacherId: string,
): Promise<Assessment | null> {
  const row = await db
    .prepare(
      `SELECT a.id, a.section_id, a.quarter, a.component, a.title,
              a.highest_possible_score, a.position
         FROM assessments a
         JOIN sections s ON s.id = a.section_id
        WHERE a.id = ? AND s.teacher_id = ?`,
    )
    .bind(assessmentId, teacherId)
    .first<AssessmentRow>();

  return row ? toAssessment(row) : null;
}

export type ScoreEntry = { studentId: string; rawScore: number | null };

/**
 * Saves a whole column of the class record. A null rawScore means "not yet
 * recorded", which the grade computation treats differently from a zero.
 * Runs as one batch so a half-saved column is not possible.
 */
export async function upsertScores(
  db: Database,
  assessmentId: string,
  entries: ScoreEntry[],
): Promise<number> {
  await db.batch(
    entries.map((entry) =>
      db
        .prepare(
          `INSERT INTO scores (assessment_id, student_id, raw_score, updated_at)
           VALUES (?, ?, ?, unixepoch())
           ON CONFLICT (assessment_id, student_id)
           DO UPDATE SET raw_score = excluded.raw_score, updated_at = excluded.updated_at`,
        )
        .bind(assessmentId, entry.studentId, entry.rawScore),
    ),
  );

  return entries.length;
}
