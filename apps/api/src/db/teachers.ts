import type { Database } from "./database";
import type { OnboardingInput, Teacher } from "../types";
import {
  teacherColumns,
  toTeacher,
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
  const row = await db
    .prepare(
      `UPDATE teachers
          SET region = ?, division = ?, school_id = ?, school = ?,
              school_year = ?, school_head = ?, teacher_role = ?,
              grade_level = ?, onboarded_at = unixepoch()
        WHERE id = ?
      RETURNING ${teacherColumns()}`,
    )
    .bind(
      input.region,
      input.division,
      input.schoolId,
      input.schoolName,
      input.schoolYear,
      input.schoolHead,
      input.role,
      input.gradeLevel,
      teacherId,
    )
    .first<TeacherRow>();

  return row ? toTeacher(row) : null;
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
