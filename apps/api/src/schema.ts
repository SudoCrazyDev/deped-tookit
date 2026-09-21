import { z } from "zod";

export const weightProfile = z.enum([
  "g1_10_languages_ap_esp",
  "g1_10_science_math",
  "g1_10_mapeh_epp_tle",
  "shs_core",
  "shs_academic",
  "shs_tvl_sports_arts",
]);

export const credentials = z.object({
  email: z.email().max(254),
  password: z.string().min(8).max(200),
});

/**
 * A Philippine mobile number in E.164 form: +63 then the ten-digit subscriber
 * number, which always begins with 9. Teachers type the ten digits and the
 * client prepends +63, so anything else reaching here is a bad request.
 */
export const phContactNumber = z
  .string()
  .trim()
  .regex(/^\+639\d{9}$/, "Enter a Philippine mobile number, e.g. +63 917 123 4567");

export const signupInput = credentials.extend({
  contactNumber: phContactNumber,
  /** Turnstile token from the signup widget. Capped at Cloudflare's own limit. */
  turnstileToken: z.string().min(1, "Complete the human check").max(2048),
  fullName: z.string().trim().min(1).max(120).optional(),
  school: z.string().trim().max(160).optional(),
});

// --- Onboarding -----------------------------------------------------------
// The one-time wizard a teacher completes after signup. Each step's fields are
// grouped below so the client can validate a step on its own; `onboardingInput`
// is what the finished wizard posts.

/**
 * The 17 DepEd regions, keyed by the code the client shows in its dropdown.
 * Kept as an enum rather than free text so reports can group by region without
 * first having to reconcile "Region 4A", "IV-A" and "CALABARZON".
 */
export const region = z.enum([
  "NCR",
  "CAR",
  "I",
  "II",
  "III",
  "IV-A",
  "MIMAROPA",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
  "XII",
  "XIII",
  "BARMM",
]);

/**
 * Grade levels as codes, not numbers: Kinder has no grade number, and a
 * teacher's own level is a label rather than the integer `sections.gradeLevel`
 * feeds into the weight profile.
 */
export const gradeLevel = z.enum([
  "k1",
  "k2",
  "g1",
  "g2",
  "g3",
  "g4",
  "g5",
  "g6",
  "g7",
  "g8",
  "g9",
  "g10",
  "g11",
  "g12",
]);

/**
 * A class adviser holds one or more advisory sections; a floating teacher has
 * no advisory and teaches several subjects across other people's sections.
 */
export const teacherRole = z.enum(["class_adviser", "floating_teacher"]);

/** One advisory class: a grade level and the section's name. */
export const advisory = z.object({
  gradeLevel,
  sectionName: z.string().trim().min(1, "Enter the section name").max(80),
});

/** Step 1 — where the teacher teaches. */
export const schoolProfile = z.object({
  region,
  division: z.string().trim().min(1, "Enter your division").max(120),
  // DepEd school IDs are six digits, but the older ones are shorter and a few
  // annexes carry a letter, so this stays a length check rather than a format.
  schoolId: z.string().trim().min(1, "Enter your school ID").max(20),
  schoolName: z.string().trim().min(1, "Enter your school name").max(160),
  schoolYear: z.string().regex(/^\d{4}-\d{4}$/, "Use the form 2026-2027"),
  schoolHead: z.string().trim().min(1, "Enter your school head").max(120),
});

/**
 * The finished wizard.
 *
 * `gradeLevel` and `advisories` are the two halves of one answer and which of
 * them is required depends on `role`, so both are optional in the shape and
 * the refinement below decides. A discriminated union would say the same
 * thing, but this keeps one flat object for the client form to bind to and
 * one flat object for the route handler to read.
 */
export const onboardingInput = schoolProfile
  .extend({
    role: teacherRole,
    /** Floating teachers only — the single level they handle. */
    gradeLevel: gradeLevel.optional(),
    /** Class advisers only, at least one. */
    advisories: z.array(advisory).max(20).default([]),
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

      // A repeated grade level is expected; the same section twice is a slip,
      // and the unique index would reject it as a 500 rather than a message.
      const seen = new Set<string>();
      value.advisories.forEach((a, i) => {
        const key = `${a.gradeLevel}/${a.sectionName.toLowerCase()}`;
        if (seen.has(key)) {
          ctx.addIssue({
            code: "custom",
            path: ["advisories", i, "sectionName"],
            message: "You have already added this section",
          });
        }
        seen.add(key);
      });
    } else if (!value.gradeLevel) {
      ctx.addIssue({
        code: "custom",
        path: ["gradeLevel"],
        message: "Choose the grade level you handle",
      });
    }
  });

export const sectionInput = z.object({
  name: z.string().trim().min(1).max(80),
  gradeLevel: z.coerce.number().int().min(1).max(12),
  subject: z.string().trim().min(1).max(80),
  // e.g. "2026-2027"
  schoolYear: z.string().regex(/^\d{4}-\d{4}$/, "Use the form 2026-2027"),
  weightProfile,
});

export const studentInput = z.object({
  // The Learner Reference Number is 12 digits, but teachers often add a
  // learner before the LRN has been issued.
  lrn: z
    .string()
    .regex(/^\d{12}$/, "LRN must be 12 digits")
    .nullish(),
  lastName: z.string().trim().min(1).max(60),
  firstName: z.string().trim().min(1).max(60),
  middleName: z.string().trim().max(60).nullish(),
  sex: z.enum(["M", "F"]),
  birthdate: z.iso.date().nullish(),
});

export const assessmentInput = z.object({
  quarter: z.coerce.number().int().min(1).max(4),
  component: z.enum(["written_work", "performance_task", "quarterly_assessment"]),
  title: z.string().trim().min(1).max(120),
  highestPossibleScore: z.coerce.number().positive().max(1000),
  position: z.coerce.number().int().min(0).default(0),
});

/** Saving a whole column of the class record in one request. */
export const scoresInput = z.object({
  scores: z
    .array(
      z.object({
        studentId: z.string().min(1),
        // null means "not recorded yet", which is different from a zero.
        rawScore: z.number().min(0).nullable(),
      }),
    )
    .min(1)
    .max(200),
});

export const quarterParam = z.coerce.number().int().min(1).max(4);
