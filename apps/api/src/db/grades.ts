import type { Database } from "./database";
import type { ComponentTotals } from "../lib/grading";

/**
 * How an assessment with no recorded score is treated.
 *
 * `ignore` leaves it out of both the raw and the highest-possible totals, so a
 * quarter in progress reads as a grade on the work done so far. `zero` counts
 * every assessment in the class record, which is what you want once the
 * quarter is closed.
 */
export type MissingScorePolicy = "ignore" | "zero";

export type LearnerTotals = {
  studentId: string;
  lastName: string;
  firstName: string;
  middleName: string | null;
  totals: { ww: ComponentTotals; pt: ComponentTotals; qa: ComponentTotals };
};

type TotalsRow = {
  student_id: string;
  last_name: string;
  first_name: string;
  middle_name: string | null;
  component: string | null;
  raw: number | null;
  highest: number | null;
};

const COMPONENT_KEY: Record<string, "ww" | "pt" | "qa"> = {
  written_work: "ww",
  performance_task: "pt",
  quarterly_assessment: "qa",
};

const emptyTotals = () => ({
  ww: { raw: 0, highestPossible: 0 },
  pt: { raw: 0, highestPossible: 0 },
  qa: { raw: 0, highestPossible: 0 },
});

/**
 * Per-component score totals for every learner in a class, for one quarter.
 * The database sums the scores; the caller applies the weights. Learners with
 * nothing recorded still appear, with zeroed totals.
 */
export async function componentTotals(
  db: Database,
  sectionId: string,
  quarter: number,
  missing: MissingScorePolicy,
): Promise<LearnerTotals[]> {
  // Counting the highest-possible score only for rows that have a score is
  // what makes `ignore` work. The two branches are a closed set, never input.
  const highestExpr =
    missing === "zero"
      ? "SUM(a.highest_possible_score)"
      : "SUM(CASE WHEN sc.raw_score IS NULL THEN 0 ELSE a.highest_possible_score END)";

  const { results } = await db
    .prepare(
      `SELECT st.id AS student_id, st.last_name, st.first_name, st.middle_name,
              a.component,
              SUM(COALESCE(sc.raw_score, 0)) AS raw,
              ${highestExpr} AS highest
         FROM enrollments e
         JOIN students st ON st.id = e.student_id
         LEFT JOIN assessments a ON a.section_id = e.section_id AND a.quarter = ?
         LEFT JOIN scores sc ON sc.assessment_id = a.id AND sc.student_id = st.id
        WHERE e.section_id = ? AND e.dropped_at IS NULL
        GROUP BY st.id, a.component
        ORDER BY st.last_name, st.first_name`,
    )
    .bind(quarter, sectionId)
    .all<TotalsRow>();

  // Rows arrive one per (learner, component); fold them back into one each.
  const byStudent = new Map<string, LearnerTotals>();

  for (const row of results) {
    let entry = byStudent.get(row.student_id);
    if (!entry) {
      entry = {
        studentId: row.student_id,
        lastName: row.last_name,
        firstName: row.first_name,
        middleName: row.middle_name,
        totals: emptyTotals(),
      };
      byStudent.set(row.student_id, entry);
    }

    // A learner with no assessments at all yields a row with a null component.
    const key = row.component ? COMPONENT_KEY[row.component] : undefined;
    if (!key) continue;

    entry.totals[key] = { raw: row.raw ?? 0, highestPossible: row.highest ?? 0 };
  }

  return [...byStudent.values()];
}
