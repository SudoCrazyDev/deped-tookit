import type { Database } from "./database";
import type { Advisory, OnboardingInput, Teacher } from "../types";
import {
  teacherColumns,
  toAdvisory,
  toTeacher,
  type AdvisoryRow,
  type TeacherRow,
  type TeacherWithHashRow,
} from "./mappers";
import { rethrowAsUniqueViolation } from "./errors";

/** Throws UniqueViolationError("teachers.email") if the address is taken. */
export async function create(
  db: Database,
  input: {
    email: string;
    passwordHash: string;
    contactNumber: string;
    fullName: string | null;
    school: string | null;
  },
): Promise<Teacher> {
  const id = crypto.randomUUID();

  await rethrowAsUniqueViolation("teachers.email", () =>
    db
      .prepare(
        `INSERT INTO teachers (id, email, password_hash, full_name, contact_number, school)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        input.email,
        input.passwordHash,
        input.fullName,
        input.contactNumber,
        input.school,
      )
      .run(),
  );

  return {
    id,
    email: input.email,
    fullName: input.fullName,
    contactNumber: input.contactNumber,
    school: input.school,
    // The onboarding wizard fills these in; a brand-new teacher has none of
    // them, and the null `onboardedAt` is what sends them to it.
    region: null,
    division: null,
    schoolId: null,
    schoolYear: null,
    schoolHead: null,
    role: null,
    gradeLevel: null,
    onboardedAt: null,
  };
}

/**
 * Stores the finished onboarding wizard and marks the teacher as onboarded.
 *
 * Written as one statement so a teacher is never left half-onboarded, and
 * `RETURNING` hands back the updated row so the caller does not read again.
 */
export async function completeOnboarding(
  db: Database,
  teacherId: string,
  input: OnboardingInput,
): Promise<Teacher | null> {
  const adviser = input.role === "class_adviser";

  // The two halves of the role answer are stored where they belong and the
  // other is emptied, so a teacher who switches role on the way through the
  // wizard cannot leave the previous answer behind.
  const advisories = adviser ? input.advisories : [];
  const gradeLevel = adviser ? null : (input.gradeLevel ?? null);

  const statements = [
    db
      .prepare(
        `UPDATE teachers
            SET region = ?, division = ?, school_id = ?, school = ?,
                school_year = ?, school_head = ?, teacher_role = ?,
                grade_level = ?, onboarded_at = unixepoch()
          WHERE id = ?`,
      )
      .bind(
        input.region,
        input.division,
        input.schoolId,
        input.schoolName,
        input.schoolYear,
        input.schoolHead,
        input.role,
        gradeLevel,
        teacherId,
      ),
    // Replace rather than merge: the wizard always posts the whole list, so
    // anything not in it was removed by the teacher.
    db.prepare("DELETE FROM teacher_advisories WHERE teacher_id = ?").bind(teacherId),
    ...advisories.map((a, position) =>
      db
        .prepare(
          `INSERT INTO teacher_advisories
             (id, teacher_id, grade_level, section_name, position)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .bind(crypto.randomUUID(), teacherId, a.gradeLevel, a.sectionName, position),
    ),
  ];

  await rethrowAsUniqueViolation("teacher_advisories.section", () => db.batch(statements));

  return findById(db, teacherId);
}

/** The advisory classes a teacher entered, in the order they entered them. */
export async function listAdvisories(
  db: Database,
  teacherId: string,
): Promise<Advisory[]> {
  const { results } = await db
    .prepare(
      `SELECT grade_level, section_name
         FROM teacher_advisories
        WHERE teacher_id = ?
        ORDER BY position`,
    )
    .bind(teacherId)
    .all<AdvisoryRow>();

  return results.map(toAdvisory);
}

async function findById(db: Database, teacherId: string): Promise<Teacher | null> {
  const row = await db
    .prepare(`SELECT ${teacherColumns()} FROM teachers WHERE id = ?`)
    .bind(teacherId)
    .first<TeacherRow>();

  return row ? toTeacher(row) : null;
}

/**
 * Clears the onboarding answers and sends the teacher back to the wizard.
 *
 * Every column the wizard owns is nulled, `school` included — it is the school
 * name the wizard collects, not something the teacher set elsewhere. Nulling
 * `onboarded_at` is what RequireAuth reads, so the redirect happens on the
 * next render without anything else having to know a reset took place.
 */
export async function resetOnboarding(
  db: Database,
  teacherId: string,
): Promise<Teacher | null> {
  await db.batch([
    db
      .prepare(
        `UPDATE teachers
            SET region = NULL, division = NULL, school_id = NULL, school = NULL,
                school_year = NULL, school_head = NULL, teacher_role = NULL,
                grade_level = NULL, onboarded_at = NULL
          WHERE id = ?`,
      )
      .bind(teacherId),
    db.prepare("DELETE FROM teacher_advisories WHERE teacher_id = ?").bind(teacherId),
  ]);

  return findById(db, teacherId);
}

/**
 * Returns the teacher along with their password hash, for login only.
 * Every other read uses a function that cannot leak the hash.
 */
export async function findByEmailWithHash(
  db: Database,
  email: string,
): Promise<{ teacher: Teacher; passwordHash: string } | null> {
  const row = await db
    .prepare(
      `SELECT ${teacherColumns()}, password_hash
         FROM teachers WHERE email = ?`,
    )
    .bind(email)
    .first<TeacherWithHashRow>();

  return row ? { teacher: toTeacher(row), passwordHash: row.password_hash } : null;
}

// --- Sessions -------------------------------------------------------------

export async function createSession(
  db: Database,
  teacherId: string,
  ttlSeconds: number,
): Promise<string> {
  const sessionId = crypto.randomUUID();
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;

  await db
    .prepare("INSERT INTO sessions (id, teacher_id, expires_at) VALUES (?, ?, ?)")
    .bind(sessionId, teacherId, expiresAt)
    .run();

  return sessionId;
}

/** Resolves a session id to its teacher, or null if it is unknown or expired. */
export async function findBySession(
  db: Database,
  sessionId: string,
): Promise<Teacher | null> {
  const row = await db
    .prepare(
      `SELECT ${teacherColumns("t")}
         FROM sessions s
         JOIN teachers t ON t.id = s.teacher_id
        WHERE s.id = ? AND s.expires_at > unixepoch()`,
    )
    .bind(sessionId)
    .first<TeacherRow>();

  return row ? toTeacher(row) : null;
}

export async function deleteSession(db: Database, sessionId: string): Promise<void> {
  await db.prepare("DELETE FROM sessions WHERE id = ?").bind(sessionId).run();
}
