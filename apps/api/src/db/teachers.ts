import type { Database } from "./database";
import type { Teacher } from "../types";
import { toTeacher, type TeacherRow, type TeacherWithHashRow } from "./mappers";
import { rethrowAsUniqueViolation } from "./errors";

/** Throws UniqueViolationError("teachers.email") if the address is taken. */
export async function create(
  db: Database,
  input: { email: string; passwordHash: string; fullName: string; school: string | null },
): Promise<Teacher> {
  const id = crypto.randomUUID();

  await rethrowAsUniqueViolation("teachers.email", () =>
    db
      .prepare(
        `INSERT INTO teachers (id, email, password_hash, full_name, school)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(id, input.email, input.passwordHash, input.fullName, input.school)
      .run(),
  );

  return { id, email: input.email, fullName: input.fullName, school: input.school };
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
    .prepare("SELECT id, email, password_hash, full_name, school FROM teachers WHERE email = ?")
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
      `SELECT t.id, t.email, t.full_name, t.school
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
