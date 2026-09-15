/**
 * Data access layer.
 *
 * Every SQL statement in this app lives under this directory, and every
 * function here takes the database handle as its first argument rather than
 * reaching for a binding. Route handlers deal in domain objects (camelCase,
 * already mapped) and never see a `?` placeholder or a snake_case column.
 *
 * That boundary exists for two reasons:
 *
 *  1. Routes stay readable — they validate, authorize, and shape responses.
 *  2. Moving off D1 later touches only this directory. The dialect-specific
 *     pieces are deliberately few and each has one home:
 *     `database.ts` names the driver type, `mappers.ts` absorbs row shapes,
 *     and `errors.ts` normalizes constraint violations — the one failure a
 *     Postgres driver reports completely differently. What remains inline is
 *     `unixepoch()` for timestamps and `?` placeholders.
 */

export type { Database } from "./database";

export * as teachers from "./teachers";
export * as sections from "./sections";
export * as students from "./students";
export * as assessments from "./assessments";
export * as grades from "./grades";
export { UniqueViolationError, rethrowAsUniqueViolation } from "./errors";
