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
