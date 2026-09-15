/**
 * The database handle, named once.
 *
 * Every function in this directory takes a `Database` rather than naming the
 * driver directly, so switching to Postgres later means changing this alias
 * and the query bodies — not 50 type annotations.
 */
export type Database = D1Database;
