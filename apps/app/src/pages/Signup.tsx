import { useRef, useState } from "react";
import { Link, Navigate, useLocation } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { toE164 } from "@/lib/phone";
import { signupSchema, type SignupValues } from "@/lib/validation";
import { useShake } from "@/hooks/use-shake";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { PhoneField } from "@/components/PhoneField";
import { TurnstileWidget, type TurnstileHandle } from "@/components/auth/TurnstileWidget";
import { TURNSTILE_SITE_KEY } from "@/lib/turnstile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export function Signup() {
  const { teacher, loading, signup } = useAuth();
  const location = useLocation() as { state?: { from?: string } };
  const [formError, setFormError] = useState<string | null>(null);
  const errorRef = useShake<HTMLParagraphElement>(formError);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstile = useRef<TurnstileHandle>(null);

  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    // Validate once a field has been touched, then live — so the teacher is
    // not scolded about an email they are still halfway through typing.
    mode: "onTouched",
    defaultValues: { email: "", password: "", contactNumber: "" },
  });

  if (loading) return null;
  if (teacher) return <Navigate to={location.state?.from ?? "/"} replace />;

  async function onSubmit(values: SignupValues) {
    setFormError(null);

    if (!turnstileToken) {
      setFormError("Please complete the human check below.");
      return;
    }

    try {
      await signup({
        email: values.email,
        password: values.password,
        contactNumber: toE164(values.contactNumber),
        turnstileToken,
      });
      toast.success("Account created", { description: "Welcome to DepEd ToolKit." });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Sign up failed");
      // The token was spent by that attempt, whatever the server rejected it
      // for. Without a reset the retry fails as a duplicate token instead of
      // reporting the real problem.
      turnstile.current?.reset();
    }
  }

  const submitting = form.formState.isSubmitting;

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Class records and DepEd grading, in one place."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem data-auth-item>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    autoComplete="username"
                    placeholder="juan.delacruz@deped.gov.ph"
                    disabled={submitting}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field, fieldState }) => (
              <FormItem data-auth-item>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <PasswordInput
                    autoComplete="new-password"
                    disabled={submitting}
                    {...field}
                  />
                </FormControl>
                {/* The hint and the error say the same thing; never show both. */}
                {!fieldState.error && <FormDescription>At least 8 characters.</FormDescription>}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contactNumber"
            render={({ field, fieldState }) => (
              <FormItem data-auth-item>
                <FormLabel>Contact number</FormLabel>
                <FormControl>
                  <PhoneField
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    name={field.name}
                    invalid={Boolean(fieldState.error)}
                    disabled={submitting}
                  />
                </FormControl>
                {!fieldState.error && (
                  <FormDescription>Philippine mobile number.</FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <div data-auth-item>
            <TurnstileWidget
              ref={turnstile}
              siteKey={TURNSTILE_SITE_KEY}
              onToken={setTurnstileToken}
              onError={setFormError}
            />
          </div>

          {formError && (
            <p
              ref={errorRef}
              role="alert"
              className="rounded-md border border-destructive/25 bg-destructive/8 px-3 py-2 text-sm text-destructive"
            >
              {formError}
            </p>
          )}

          <Button
            data-auth-item
            type="submit"
            className="w-full transition-transform hover:-translate-y-px active:translate-y-0"
            disabled={submitting}
          >
            {submitting && <Loader2 className="animate-spin" />}
            {submitting ? "Creating account…" : "Create account"}
          </Button>
        </form>
      </Form>
    </AuthLayout>
  );
}
