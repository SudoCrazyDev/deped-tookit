-- DepEd ToolKit initial schema.
-- Every row that belongs to a teacher carries teacher_id so each query can be
-- scoped to the signed-in teacher; teachers never see each other's learners.

CREATE TABLE teachers (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  school        TEXT,
  created_at    INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE sessions (
  id         TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX idx_sessions_teacher ON sessions(teacher_id);

-- A section is one class list: a group of learners for one subject, one S.Y.
CREATE TABLE sections (
  id             TEXT PRIMARY KEY,
  teacher_id     TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  grade_level    INTEGER NOT NULL CHECK (grade_level BETWEEN 1 AND 12),
  subject        TEXT NOT NULL,
  school_year    TEXT NOT NULL,          -- e.g. '2026-2027'
  weight_profile TEXT NOT NULL CHECK (weight_profile IN (
                   'g1_10_languages_ap_esp','g1_10_science_math','g1_10_mapeh_epp_tle',
                   'shs_core','shs_academic','shs_tvl_sports_arts')),
  archived_at    INTEGER,
  created_at     INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX idx_sections_teacher ON sections(teacher_id, archived_at);

CREATE TABLE students (
  id          TEXT PRIMARY KEY,
  teacher_id  TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  lrn         TEXT,                      -- 12-digit Learner Reference Number
  last_name   TEXT NOT NULL,
  first_name  TEXT NOT NULL,
  middle_name TEXT,
  sex         TEXT NOT NULL CHECK (sex IN ('M','F')),
  birthdate   TEXT,                      -- ISO 8601 date
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX idx_students_teacher ON students(teacher_id, last_name, first_name);
-- LRNs are unique nationally, but only among rows where one was entered.
CREATE UNIQUE INDEX idx_students_lrn ON students(teacher_id, lrn) WHERE lrn IS NOT NULL;

CREATE TABLE enrollments (
  section_id  TEXT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  student_id  TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  dropped_at  INTEGER,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (section_id, student_id)
);
CREATE INDEX idx_enrollments_student ON enrollments(student_id);

-- One graded activity: a quiz, a performance task, or the quarterly exam.
CREATE TABLE assessments (
  id                     TEXT PRIMARY KEY,
  section_id             TEXT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  quarter                INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  component              TEXT NOT NULL CHECK (component IN
                           ('written_work','performance_task','quarterly_assessment')),
  title                  TEXT NOT NULL,
  highest_possible_score REAL NOT NULL CHECK (highest_possible_score > 0),
  position               INTEGER NOT NULL DEFAULT 0,
  created_at             INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX idx_assessments_section ON assessments(section_id, quarter, component, position);

CREATE TABLE scores (
  assessment_id TEXT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  student_id    TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  -- NULL raw_score means "not yet recorded"; an absent learner gets 0 instead.
  raw_score     REAL,
  updated_at    INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (assessment_id, student_id)
);
CREATE INDEX idx_scores_student ON scores(student_id);
