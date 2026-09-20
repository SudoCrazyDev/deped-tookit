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
