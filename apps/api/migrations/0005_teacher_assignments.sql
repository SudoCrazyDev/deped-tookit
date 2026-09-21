-- Step 3 of onboarding swaps which role gets a list.
--
-- A class adviser has exactly one advisory — that is what the word means — and
-- it is the floating teacher, with no advisory and several subjects, who hands
-- back a list of the sections they handle.
--
-- So the rows stop being "advisories": a floating teacher's sections are not
-- ones they advise, and the wizard tells them as much on the previous step.
-- `teacher_assignments` covers both roles: one row for an adviser, one or more
-- for a floating teacher, each a grade level and the section's name.

ALTER TABLE teacher_advisories RENAME TO teacher_assignments;

DROP INDEX idx_advisories_teacher;
DROP INDEX idx_advisories_unique;

CREATE INDEX idx_assignments_teacher ON teacher_assignments(teacher_id, position);

-- A repeated grade level is expected; the same section twice is a slip.
CREATE UNIQUE INDEX idx_assignments_unique
  ON teacher_assignments(teacher_id, grade_level, section_name);

-- Existing answers that the new rules no longer fit.
--
-- A floating teacher was only ever asked for a bare grade level, and there is
-- nothing to invent the section names from, so they are sent back through the
-- wizard. Their school details stay on the row and the wizard prefills from
-- them, so it is a short walk rather than retyping the lot.
UPDATE teachers
   SET onboarded_at = NULL
 WHERE teacher_role = 'floating_teacher'
   AND NOT EXISTS (
     SELECT 1 FROM teacher_assignments a WHERE a.teacher_id = teachers.id
   );

-- An adviser could briefly enter several. The first one they typed is their
-- advisory; the rest were never a thing a class adviser has.
DELETE FROM teacher_assignments
 WHERE id IN (
   SELECT a.id
     FROM teacher_assignments a
     JOIN teachers t ON t.id = a.teacher_id
    WHERE t.teacher_role = 'class_adviser' AND a.position > 0
 );

-- Both roles now name their levels on `teacher_assignments`, so the single
-- level on `teachers` has nothing left to hold.
ALTER TABLE teachers DROP COLUMN grade_level;
