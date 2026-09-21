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
import type { FieldPath } from "react-hook-form";
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
  role: z.enum(["class_adviser", "floating_teacher"], {
    error: "Choose how you teach",
  }),
});

/** One class a teacher handles: a grade level and that section's name. */
export const assignmentSchema = z.object({
  gradeLevel: z.enum(gradeCodes, { error: "Choose a grade level" }),
  sectionName: z.string().trim().min(1, "Enter the section name").max(80),
});

/** A floating teacher's ceiling. An adviser is held to one by the refinement. */
export const MAX_ASSIGNMENTS = 20;

/**
 * Everything the wizard posts. The roster file in step 4 is not part of it.
 *
 * Both roles answer step 3 with the same shape and differ only in how many
 * rows they may give: a class adviser has one advisory, which is what the word
 * means, and a floating teacher lists every section they teach in.
 */
export const onboardingSchema = schoolInfoSchema
  .extend({
    ...roleSchema.shape,
    assignments: z
      .array(assignmentSchema)
      .min(1, "Add the class you handle")
      .max(MAX_ASSIGNMENTS),
  })
  .superRefine((value, ctx) => {
    if (value.role === "class_adviser" && value.assignments.length > 1) {
      ctx.addIssue({
        code: "custom",
        path: ["assignments"],
        message: "A class adviser has one advisory class",
      });
    }

    // Two rows at the same grade level are normal — that is the whole point of
    // asking for the section name — but the same section twice is a slip worth
    // catching before it reaches the unique index.
    const seen = new Set<string>();
    value.assignments.forEach((a, i) => {
      const key = `${a.gradeLevel}/${a.sectionName.trim().toLowerCase()}`;
      if (seen.has(key)) {
        ctx.addIssue({
          code: "custom",
          path: ["assignments", i, "sectionName"],
          message: "You have already added this section",
        });
      }
      seen.add(key);
    });
  });

export type OnboardingValues = z.infer<typeof onboardingSchema>;
export type AssignmentValues = z.infer<typeof assignmentSchema>;

/** Field names per step, for the Continue button to validate. */
export const ONBOARDING_STEP_FIELDS: Array<Array<FieldPath<OnboardingValues>>> = [
  ["region", "division", "schoolId", "schoolName", "schoolYear", "schoolHead"],
  ["role"],
  ["assignments"],
  [],
];
