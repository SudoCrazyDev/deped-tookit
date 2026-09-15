import type { Database } from "./database";
import type { Student } from "../types";
import { toStudent, type StudentRow } from "./mappers";
import { rethrowAsUniqueViolation } from "./errors";

const SELECT_COLUMNS = "st.id, st.lrn, st.last_name, st.first_name, st.middle_name, st.sex";

export async function listInSection(db: Database, sectionId: string): Promise<Student[]> {
  const { results } = await db
    .prepare(
      `SELECT ${SELECT_COLUMNS}
         FROM enrollments e
         JOIN students st ON st.id = e.student_id
        WHERE e.section_id = ? AND e.dropped_at IS NULL
        ORDER BY st.last_name, st.first_name`,
    )
    .bind(sectionId)
    .all<StudentRow>();

  return results.map(toStudent);
}

export type NewStudent = {
  lrn?: string | null;
  lastName: string;
  firstName: string;
  middleName?: string | null;
  sex: "M" | "F";
  birthdate?: string | null;
};

/**
 * Creates a learner and enrols them in one class. Both statements run in a
 * single batch so a failed enrolment cannot leave an unattached learner
 * behind. Throws UniqueViolationError("students.lrn") on a duplicate LRN.
 */
export async function createAndEnroll(
  db: Database,
  teacherId: string,
  sectionId: string,
  input: NewStudent,
): Promise<Student> {
  const id = crypto.randomUUID();

  await rethrowAsUniqueViolation("students.lrn", () =>
    db.batch([
      db
        .prepare(
          `INSERT INTO students
             (id, teacher_id, lrn, last_name, first_name, middle_name, sex, birthdate)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          id,
          teacherId,
          input.lrn ?? null,
          input.lastName,
          input.firstName,
          input.middleName ?? null,
          input.sex,
          input.birthdate ?? null,
        ),
      db
        .prepare("INSERT INTO enrollments (section_id, student_id) VALUES (?, ?)")
        .bind(sectionId, id),
    ]),
  );

  return {
    id,
    lrn: input.lrn ?? null,
    lastName: input.lastName,
    firstName: input.firstName,
    middleName: input.middleName ?? null,
    sex: input.sex,
  };
}
