-- Signup now collects an email, a password, and a Philippine mobile number.
-- Two changes to `teachers`:
--   * add `contact_number`, stored in E.164 (+639XXXXXXXXX)
--   * make `full_name` nullable, since it is no longer asked for at signup
--
-- SQLite cannot drop a NOT NULL constraint in place, so the table is rebuilt.
-- `defer_foreign_keys` holds the checks from the child tables (sessions,
-- sections, students, scores) until the end of the migration, by which point
-- `teachers` exists again with the same ids.

PRAGMA defer_foreign_keys = true;

CREATE TABLE teachers_new (
  id             TEXT PRIMARY KEY,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  full_name      TEXT,
  contact_number TEXT,
  school         TEXT,
  created_at     INTEGER NOT NULL DEFAULT (unixepoch())
);

INSERT INTO teachers_new (id, email, password_hash, full_name, contact_number, school, created_at)
SELECT id, email, password_hash, full_name, NULL, school, created_at FROM teachers;

DROP TABLE teachers;

ALTER TABLE teachers_new RENAME TO teachers;
