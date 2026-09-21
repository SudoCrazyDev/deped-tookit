// Mirrors the response shapes in apps/api/src/schema.ts.
// Swap this for Hono's RPC client (`hono/client` + `typeof app`) if you want
// these generated from the backend instead of hand-kept.

/** One of the 17 DepEd regions. Labels for these live in lib/deped.ts. */
export type Region =
  | "NCR"
  | "CAR"
  | "I"
  | "II"
  | "III"
  | "IV-A"
  | "MIMAROPA"
  | "V"
  | "VI"
  | "VII"
  | "VIII"
  | "IX"
  | "X"
  | "XI"
  | "XII"
  | "XIII"
  | "BARMM";

/**
 * A grade level as a code rather than a number, because Kinder has none.
 * Distinct from `Section.gradeLevel`, which is the integer 1-12 the weight
 * profile is chosen against.
 */
export type GradeLevel =
  | "k1"
  | "k2"
  | `g${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12}`;

export type TeacherRole = "class_adviser" | "floating_teacher";

/**
 * One class a teacher handles. An adviser has exactly one — their advisory —
 * and a floating teacher has one row per section they teach in.
 */
export type Assignment = {
  gradeLevel: GradeLevel;
  sectionName: string;
};

export type Teacher = {
  id: string;
  email: string;
  /** Not collected at signup, so absent until the teacher fills in a profile. */
  fullName: string | null;
  /** E.164 Philippine mobile number, e.g. "+639171234567". */
  contactNumber: string | null;
  /** The school's name, from onboarding. */
  school: string | null;

  // --- Onboarding. All null until the wizard is finished. ---
  region: Region | null;
  division: string | null;
  schoolId: string | null;
  schoolYear: string | null;
  schoolHead: string | null;
  role: TeacherRole | null;
  /** Unix seconds. Null means the teacher still owes us the wizard. */
  onboardedAt: number | null;
};

export type Section = {
  id: string;
  name: string;
  gradeLevel: number;
  subject: string;
  schoolYear: string;
  weightProfile: WeightProfile;
  studentCount: number;
};

/**
 * Which set of component weights applies, per DepEd Order No. 8, s. 2015.
 * For Grades 1-10 the weights depend on the subject group, not just the level.
 */
export type WeightProfile =
  | "g1_10_languages_ap_esp"
  | "g1_10_science_math"
  | "g1_10_mapeh_epp_tle"
  | "shs_core"
  | "shs_academic"
  | "shs_tvl_sports_arts";

export type Student = {
  id: string;
  lrn: string | null;
  lastName: string;
  firstName: string;
  middleName: string | null;
  sex: "M" | "F";
};

export type Quarter = 1 | 2 | 3 | 4;

export type AssessmentComponent = "written_work" | "performance_task" | "quarterly_assessment";

export type Assessment = {
  id: string;
  sectionId: string;
  quarter: Quarter;
  component: AssessmentComponent;
  title: string;
  highestPossibleScore: number;
};
