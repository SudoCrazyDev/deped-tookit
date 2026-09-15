import type { Database } from "./db/database";
import type { WeightProfile } from "./lib/grading";

export type Bindings = {
  DB: Database;
  SESSION_SECRET: string;
  APP_ORIGIN: string;
  // UPLOADS: R2Bucket;  // enable alongside the r2_buckets binding in wrangler.jsonc
};

export type Variables = {
  teacher: Teacher;
};

export type Env = { Bindings: Bindings; Variables: Variables };

// --- Domain objects -------------------------------------------------------
// What route handlers and the frontend deal in. The database's own row shapes
// live in src/db/mappers.ts and never escape that directory.

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
