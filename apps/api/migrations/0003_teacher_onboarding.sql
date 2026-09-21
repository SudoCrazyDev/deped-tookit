-- Onboarding: the school details, teaching role and grade level a teacher
-- gives once, right after signup.
--
-- All of it hangs off `teachers` rather than a table of its own: there is
-- exactly one row per teacher, every column is answered in the same sitting,
-- and no query wants the profile without the teacher.
--
-- `school` already exists (an optional signup field the client never sent), so
-- the wizard's "School Name" reuses it instead of adding a second name column.
--
-- ALTER TABLE ADD COLUMN is the cheap path here — no table rebuild — but
-- SQLite will not attach a CHECK to a column added this way, so the two
-- constrained columns are validated in src/schema.ts instead.

ALTER TABLE teachers ADD COLUMN region      TEXT;
ALTER TABLE teachers ADD COLUMN division    TEXT;
ALTER TABLE teachers ADD COLUMN school_id   TEXT;
ALTER TABLE teachers ADD COLUMN school_year TEXT;
ALTER TABLE teachers ADD COLUMN school_head TEXT;

-- 'class_adviser' | 'subject_teacher' — see teacherRole in src/schema.ts.
ALTER TABLE teachers ADD COLUMN teacher_role TEXT;

-- A grade-level code, not the integer `sections.grade_level` uses: Kinder has
-- no number. 'k1' | 'k2' | 'g1' .. 'g12' — see gradeLevel in src/schema.ts.
ALTER TABLE teachers ADD COLUMN grade_level TEXT;

-- NULL until the wizard is finished. The app reads this to decide whether to
-- send a teacher to /onboarding, so a half-filled wizard is not "done".
ALTER TABLE teachers ADD COLUMN onboarded_at INTEGER;
