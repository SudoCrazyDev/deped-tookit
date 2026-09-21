-- Two changes to what onboarding records about how a teacher teaches.
--
-- 1. "Subject Teacher" is called a Floating Teacher, so the stored code
--    follows the label. Renaming it rather than leaving 'subject_teacher'
--    behind the new wording keeps the next person from having to learn that
--    the two names mean the same thing.
--
-- 2. A class adviser can hold more than one advisory, and two of them may sit
--    at the same grade level with different sections (Grade 7 - Rizal and
--    Grade 7 - Mabini). That is a list, so it gets a table rather than more
--    columns on `teachers`.
--
-- `teachers.grade_level` stays, and now means "the single level a floating
-- teacher handles". For a class adviser it is NULL and the levels live here.

UPDATE teachers SET teacher_role = 'floating_teacher' WHERE teacher_role = 'subject_teacher';

CREATE TABLE teacher_advisories (
  id           TEXT PRIMARY KEY,
  teacher_id   TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  -- Same codes as teachers.grade_level: 'k1' | 'k2' | 'g1' .. 'g12'.
  grade_level  TEXT NOT NULL,
  section_name TEXT NOT NULL,
  -- The order the teacher entered them in, so the list reads back unchanged.
  position     INTEGER NOT NULL DEFAULT 0,
  created_at   INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX idx_advisories_teacher ON teacher_advisories(teacher_id, position);

-- A repeated grade level is expected; the same section twice is a slip.
CREATE UNIQUE INDEX idx_advisories_unique
  ON teacher_advisories(teacher_id, grade_level, section_name);
