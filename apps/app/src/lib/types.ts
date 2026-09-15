// Mirrors the response shapes in apps/api/src/schema.ts.
// Swap this for Hono's RPC client (`hono/client` + `typeof app`) if you want
// these generated from the backend instead of hand-kept.

export type Teacher = {
  id: string;
  email: string;
  fullName: string;
  school: string | null;
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
