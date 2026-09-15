/**
 * Row shapes as the database returns them, and the functions that turn them
 * into the camelCase domain objects the rest of the app uses.
 *
 * This is the seam that absorbs a column rename or a type change: if
 * `created_at` becomes a `timestamptz` instead of an epoch integer, only this
 * file and the queries that select it need to know.
 */
import type { Assessment, Section, SectionWithCount, Student, Teacher } from "../types";
import type { WeightProfile } from "../lib/grading";

export type TeacherRow = {
  id: string;
  email: string;
  full_name: string;
  school: string | null;
};

export type TeacherWithHashRow = TeacherRow & { password_hash: string };

export type SectionRow = {
  id: string;
  name: string;
  grade_level: number;
  subject: string;
  school_year: string;
  weight_profile: WeightProfile;
};

export type SectionWithCountRow = SectionRow & { student_count: number };

export type StudentRow = {
  id: string;
  lrn: string | null;
  last_name: string;
  first_name: string;
  middle_name: string | null;
  sex: "M" | "F";
};

export type AssessmentRow = {
  id: string;
  section_id: string;
  quarter: number;
  component: string;
  title: string;
  highest_possible_score: number;
  position: number;
};

export const toTeacher = (r: TeacherRow): Teacher => ({
  id: r.id,
  email: r.email,
  fullName: r.full_name,
  school: r.school,
});

export const toSection = (r: SectionRow): Section => ({
  id: r.id,
  name: r.name,
  gradeLevel: r.grade_level,
  subject: r.subject,
  schoolYear: r.school_year,
  weightProfile: r.weight_profile,
});

export const toSectionWithCount = (r: SectionWithCountRow): SectionWithCount => ({
  ...toSection(r),
  studentCount: r.student_count,
});

export const toStudent = (r: StudentRow): Student => ({
  id: r.id,
  lrn: r.lrn,
  lastName: r.last_name,
  firstName: r.first_name,
  middleName: r.middle_name,
  sex: r.sex,
});

export const toAssessment = (r: AssessmentRow): Assessment => ({
  id: r.id,
  sectionId: r.section_id,
  quarter: r.quarter,
  component: r.component as Assessment["component"],
  title: r.title,
  highestPossibleScore: r.highest_possible_score,
  position: r.position,
});
