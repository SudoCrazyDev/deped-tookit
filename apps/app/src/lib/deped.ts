/**
 * The DepEd vocabulary the onboarding wizard asks a teacher to pick from.
 *
 * These lists are the client half of the enums in apps/api/src/schema.ts —
 * the codes must stay identical or the server rejects a valid-looking answer.
 * Labels live here rather than there because only the UI shows them.
 */
import type { GradeLevel, Region, TeacherRole } from "@/lib/types";

/**
 * The 17 regions. Listed in DepEd's own order — NCR and CAR first, then the
 * numbered regions — rather than alphabetically, because that is the order
 * teachers are used to scanning on forms.
 */
export const REGIONS: Array<{ code: Region; label: string }> = [
  { code: "NCR", label: "NCR — National Capital Region" },
  { code: "CAR", label: "CAR — Cordillera Administrative Region" },
  { code: "I", label: "Region I — Ilocos Region" },
  { code: "II", label: "Region II — Cagayan Valley" },
  { code: "III", label: "Region III — Central Luzon" },
  { code: "IV-A", label: "Region IV-A — CALABARZON" },
  { code: "MIMAROPA", label: "MIMAROPA Region" },
  { code: "V", label: "Region V — Bicol Region" },
  { code: "VI", label: "Region VI — Western Visayas" },
  { code: "VII", label: "Region VII — Central Visayas" },
  { code: "VIII", label: "Region VIII — Eastern Visayas" },
  { code: "IX", label: "Region IX — Zamboanga Peninsula" },
  { code: "X", label: "Region X — Northern Mindanao" },
  { code: "XI", label: "Region XI — Davao Region" },
  { code: "XII", label: "Region XII — SOCCSKSARGEN" },
  { code: "XIII", label: "Region XIII — Caraga" },
  { code: "BARMM", label: "BARMM — Bangsamoro" },
];

export type GradeGroup = {
  label: string;
  options: Array<{ code: GradeLevel; label: string }>;
};

const grades = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => {
    const n = from + i;
    return { code: `g${n}` as GradeLevel, label: `Grade ${n}` };
  });

/**
 * Grade levels, grouped the way the K-12 program is structured, so a teacher
 * finds their level by the stage they teach rather than by scrolling a flat
 * list of fourteen.
 */
export const GRADE_GROUPS: GradeGroup[] = [
  {
    label: "Kindergarten",
    options: [
      { code: "k1", label: "Kinder 1" },
      { code: "k2", label: "Kinder 2" },
    ],
  },
  { label: "Elementary", options: grades(1, 6) },
  { label: "Junior High School", options: grades(7, 10) },
  { label: "Senior High School", options: grades(11, 12) },
];

const GRADE_LABELS = new Map(
  GRADE_GROUPS.flatMap((g) => g.options).map((o) => [o.code, o.label]),
);

export const gradeLevelLabel = (code: GradeLevel) => GRADE_LABELS.get(code) ?? code;

export const TEACHER_ROLES: Array<{
  code: TeacherRole;
  title: string;
  description: string;
}> = [
  {
    code: "class_adviser",
    title: "Class Adviser",
    description:
      "You handle one section and keep its class record across every subject.",
  },
  {
    code: "subject_teacher",
    title: "Subject Teacher",
    description: "You teach one or more subjects across several sections.",
  },
];

/**
 * School years to offer, newest-but-one first.
 *
 * The Philippine school year opens around June, so which year "this" one is
 * depends on the month: in March 2027 a teacher is still finishing S.Y.
 * 2026-2027, not starting 2027-2028. June is the cutover.
 */
export function schoolYearOptions(now = new Date()): string[] {
  const startYear = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
  // The one just ended, the current one, and the one being planned.
  return [-1, 0, 1].map((offset) => {
    const y = startYear + offset;
    return `${y}-${y + 1}`;
  });
}

/** The option a teacher almost always wants, pre-selected. */
export const currentSchoolYear = (now = new Date()) => schoolYearOptions(now)[1];
