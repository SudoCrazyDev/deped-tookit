import { useState } from "react";
import { Link, Navigate, useLocation } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { loginSchema, type LoginValues } from "@/lib/validation";
import { useShake } from "@/hooks/use-shake";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export function Login() {
  const { teacher, loading, login } = useAuth();
  const location = useLocation() as { state?: { from?: string } };
  const [formError, setFormError] = useState<string | null>(null);
  const errorRef = useShake<HTMLParagraphElement>(formError);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    mode: "onTouched",
    defaultValues: { email: "", password: "" },
  });

  if (loading) return null;
  if (teacher) return <Navigate to={location.state?.from ?? "/"} replace />;

  async function onSubmit(values: LoginValues) {
    setFormError(null);
    try {
      await login(values.email, values.password);
      toast.success("Signed in");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Sign in failed");
    }
  }

  const submitting = form.formState.isSubmitting;

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Welcome back."
      footer={
        <>
          No account yet?{" "}
          <Link
            to="/signup"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Create one
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
            render={({ field }) => (
              <FormItem data-auth-item>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <PasswordInput
                    autoComplete="current-password"
                    disabled={submitting}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </Form>
    </AuthLayout>
  );
}
