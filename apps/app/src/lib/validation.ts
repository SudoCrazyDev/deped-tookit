/**
 * Client-side form schemas.
 *
 * These mirror apps/api/src/schema.ts deliberately: the server stays the
 * authority, and these exist so a teacher is told what is wrong before the
 * round trip. Where both check the same rule the wording is kept identical, so
 * a client-side rejection and a server-side one do not read as two different
 * problems.
 */
import { z } from "zod";
import { PH_SUBSCRIBER } from "./phone";
import { GRADE_GROUPS, REGIONS } from "./deped";
import type { GradeLevel, Region } from "./types";

export const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

export const signupSchema = z.object({
  email: z.email("Enter a valid email address").max(254),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(200, "Password must be 200 characters or fewer"),
  contactNumber: z
    .string()
    .regex(PH_SUBSCRIBER, "Enter a Philippine mobile number, e.g. 917 123 4567"),
});

export type LoginValues = z.infer<typeof loginSchema>;
export type SignupValues = z.infer<typeof signupSchema>;

// --- Onboarding -----------------------------------------------------------
// One schema per wizard step, plus the union the wizard submits. Splitting it
// this way lets the Next button validate only the step in front of the
// teacher: react-hook-form holds all the answers in a single form, and each
// step calls `trigger` with its own field names.

/**
 * Derived from the dropdown lists rather than repeated, so a region added to
 * lib/deped.ts cannot become one the form then refuses.
 */
const regionCodes = REGIONS.map((r) => r.code) as [Region, ...Region[]];
const gradeCodes = GRADE_GROUPS.flatMap((g) => g.options).map((o) => o.code) as [
  GradeLevel,
  ...GradeLevel[],
];

export const schoolInfoSchema = z.object({
  region: z.enum(regionCodes, { error: "Choose your region" }),
  division: z.string().trim().min(1, "Enter your division").max(120),
  schoolId: z.string().trim().min(1, "Enter your school ID").max(20),
  schoolName: z.string().trim().min(1, "Enter your school name").max(160),
  schoolYear: z.string().regex(/^\d{4}-\d{4}$/, "Choose a school year"),
  schoolHead: z.string().trim().min(1, "Enter your school head").max(120),
});

export const roleSchema = z.object({
  role: z.enum(["class_adviser", "subject_teacher"], {
    error: "Choose how you teach",
  }),
});

export const gradeSchema = z.object({
  gradeLevel: z.enum(gradeCodes, { error: "Choose the grade level you handle" }),
});

/** Everything the wizard posts. The roster file in step 4 is not part of it. */
export const onboardingSchema = schoolInfoSchema.extend({
  ...roleSchema.shape,
  ...gradeSchema.shape,
});

export type OnboardingValues = z.infer<typeof onboardingSchema>;

/** Field names per step, in the order the wizard shows them. */
export const ONBOARDING_STEP_FIELDS: Array<Array<keyof OnboardingValues>> = [
  ["region", "division", "schoolId", "schoolName", "schoolYear", "schoolHead"],
  ["role"],
  ["gradeLevel"],
  [],
];
