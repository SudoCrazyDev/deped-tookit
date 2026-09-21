import type { z } from "zod";
import type { Database } from "./db/database";
import type { WeightProfile } from "./lib/grading";
import type {
  assignment,
  gradeLevel,
  onboardingInput,
  region,
  teacherRole,
} from "./schema";

export type Bindings = {
  DB: Database;
  SESSION_SECRET: string;
  APP_ORIGIN: string;
  /** Turnstile widget secret. Signup fails closed if this is missing. */
  TURNSTILE_SECRET_KEY: string;
  // UPLOADS: R2Bucket;  // enable alongside the r2_buckets binding in wrangler.jsonc
};

export type Variables = {
  teacher: Teacher;
};

export type Env = { Bindings: Bindings; Variables: Variables };

// --- Domain objects -------------------------------------------------------
// What route handlers and the frontend deal in. The database's own row shapes
// live in src/db/mappers.ts and never escape that directory.

/** One of the 17 DepEd regions. See `region` in schema.ts for the codes. */
export type Region = z.infer<typeof region>;

/** "k1" | "k2" | "g1" .. "g12" — Kinder has no grade number. */
export type GradeLevel = z.infer<typeof gradeLevel>;

export type TeacherRole = z.infer<typeof teacherRole>;

/**
 * One class a teacher handles. An adviser has exactly one — their advisory —
 * and a floating teacher has one row per section they teach in.
 */
export type Assignment = z.infer<typeof assignment>;

/**
 * Everything the onboarding wizard collects. Null throughout until the teacher
 * finishes it, which is what `onboardedAt` records.
 */
export type TeacherProfile = {
  region: Region | null;
  division: string | null;
  schoolId: string | null;
  /** The school's name. Stored in `teachers.school`. */
  school: string | null;
  schoolYear: string | null;
  schoolHead: string | null;
  role: TeacherRole | null;
  /** Unix seconds the wizard was completed, or null while it is outstanding. */
  onboardedAt: number | null;
};

/** What the finished onboarding wizard posts. */
export type OnboardingInput = z.infer<typeof onboardingInput>;

export type Teacher = TeacherProfile & {
  id: string;
  email: string;
  /** Not collected at signup, so absent until the teacher fills in a profile. */
  fullName: string | null;
  /** E.164 Philippine mobile number, e.g. "+639171234567". */
  contactNumber: string | null;
};

export type Section = {
  id: string;
  name: string;
  gradeLevel: number;
  subject: string;
  schoolYear: string;
  weightProfile: WeightProfile;
};

export type SectionWithCount = Section & { studentCount: number };

export type Student = {
  id: string;
  lrn: string | null;
  lastName: string;
  firstName: string;
  middleName: string | null;
  sex: "M" | "F";
};

export type AssessmentComponent =
  | "written_work"
  | "performance_task"
  | "quarterly_assessment";

export type Assessment = {
  id: string;
  sectionId: string;
  quarter: number;
  component: AssessmentComponent;
  title: string;
  highestPossibleScore: number;
  position: number;
};
