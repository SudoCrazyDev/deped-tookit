/**
 * Constraint violations are the one failure mode routes need to distinguish,
 * and the one reported differently by every driver: SQLite puts "UNIQUE" in
 * the message, Postgres raises SQLSTATE 23505. Detecting it here means route
 * handlers catch a typed error instead of pattern-matching driver strings.
 */
export class UniqueViolationError extends Error {
  constructor(readonly constraint: string, cause?: unknown) {
    super(`Unique constraint violated: ${constraint}`);
    this.name = "UniqueViolationError";
    this.cause = cause;
  }
}

function isUniqueViolation(err: unknown): boolean {
  // D1/SQLite. A Postgres driver would check `err.code === "23505"` instead.
  return err instanceof Error && /UNIQUE constraint failed/i.test(err.message);
}

/**
 * Runs a write, converting a unique-constraint failure into a typed error.
 * `constraint` names what was violated, for the caller's error message.
 */
export async function rethrowAsUniqueViolation<T>(
  constraint: string,
  run: () => Promise<T>,
): Promise<T> {
  try {
    return await run();
  } catch (err) {
    if (isUniqueViolation(err)) throw new UniqueViolationError(constraint, err);
    throw err;
  }
}
