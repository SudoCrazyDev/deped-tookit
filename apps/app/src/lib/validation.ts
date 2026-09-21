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

/** One advisory class: a grade level and the name of that section. */
export const advisorySchema = z.object({
  gradeLevel: z.enum(gradeCodes, { error: "Choose a grade level" }),
  sectionName: z.string().trim().min(1, "Enter the section name").max(80),
});

/**
 * Everything the wizard posts. The roster file in step 4 is not part of it.
 *
 * Step 3 asks a different question depending on step 2's answer, so both
 * shapes are held here and the refinement decides which one is required:
 * a class adviser lists their advisory sections, a floating teacher names the
 * single level they handle. The other is left empty and the server does the
 * same, so switching role mid-wizard cannot smuggle a stale answer through.
 */
export const onboardingSchema = schoolInfoSchema
  .extend({
    ...roleSchema.shape,
    gradeLevel: z.enum(gradeCodes).optional(),
    // Required rather than defaulted: a `.default()` would make zod's input
    // and output types differ, and react-hook-form binds to one type for
    // both. The form's defaultValues supply the empty array instead.
    advisories: z.array(advisorySchema).max(20),
  })
  .superRefine((value, ctx) => {
    if (value.role === "class_adviser") {
      if (value.advisories.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["advisories"],
          message: "Add at least one advisory class",
        });
      }

      // Two advisories at the same grade level are normal — that is the whole
      // point of asking for the section name — but the same section twice is
      // a slip worth catching before it reaches the unique index.
      const seen = new Set<string>();
      value.advisories.forEach((a, i) => {
        const key = `${a.gradeLevel}/${a.sectionName.trim().toLowerCase()}`;
        if (seen.has(key)) {
          ctx.addIssue({
            code: "custom",
            path: ["advisories", i, "sectionName"],
            message: "You have already added this section",
          });
        }
        seen.add(key);
      });
    } else if (value.role === "floating_teacher" && !value.gradeLevel) {
      ctx.addIssue({
        code: "custom",
        path: ["gradeLevel"],
        message: "Choose the grade level you handle",
      });
    }
  });

export type OnboardingValues = z.infer<typeof onboardingSchema>;
export type AdvisoryValues = z.infer<typeof advisorySchema>;

/**
 * Field names per step, for the Continue button to validate.
 *
 * A function rather than a constant because step 3 validates `advisories` for
 * a class adviser and `gradeLevel` for a floating teacher — validating both
 * would block Continue on whichever question is not being asked.
 */
export function onboardingStepFields(
  step: number,
  role: OnboardingValues["role"] | undefined,
): Array<FieldPath<OnboardingValues>> {
  switch (step) {
    case 0:
      return ["region", "division", "schoolId", "schoolName", "schoolYear", "schoolHead"];
    case 1:
      return ["role"];
    case 2:
      return role === "class_adviser" ? ["advisories"] : ["gradeLevel"];
    default:
      return [];
  }
}
