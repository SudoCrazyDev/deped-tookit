import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { useForm, type FieldPath, type PathValue } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import type { GradeLevel } from "@/lib/types";
import {
  onboardingSchema,
  onboardingStepFields,
  type OnboardingValues,
} from "@/lib/validation";
import {
  currentSchoolYear,
  GRADE_GROUPS,
  gradeLevelLabel,
  REGIONS,
  schoolYearOptions,
} from "@/lib/deped";
import { useShake } from "@/hooks/use-shake";
import { DURATION, EASE, gsap, motionSafe, useGSAP } from "@/lib/motion";
import { OnboardingLayout } from "@/components/onboarding/OnboardingLayout";
import { StepPanel } from "@/components/onboarding/StepPanel";
import { RoleChoice } from "@/components/onboarding/RoleChoice";
import { AdvisoryList } from "@/components/onboarding/AdvisoryList";
import { RosterUpload } from "@/components/onboarding/RosterUpload";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STEPS = ["School", "Your role", "Grade level", "Class list"];
const LAST = STEPS.length - 1;

/** Step 3 asks a different question of each role, so the rail says so too. */
function stepLabels(adviser: boolean) {
  if (!adviser) return STEPS;
  return STEPS.map((label, i) => (i === 2 ? "Advisory" : label));
}

const COPY = [
  {
    title: "Tell us about your school",
    subtitle: "This fills in the header of every form and report you print.",
  },
  {
    title: "How do you teach?",
    subtitle: "Pick the one that fits this school year — you can change it later.",
  },
  // Replaced for a class adviser — see `copy` below.
  {
    title: "Which grade level do you handle?",
    subtitle: "It sets the grading weights your classes start with.",
  },
  {
    title: "Bring in your class list",
    subtitle:
      "Have your learners in a spreadsheet? Add it here, or skip and type them in later.",
  },
];

/**
 * The grade levels in one line, for the confirmation toast: an adviser's
 * sections, or the single level a floating teacher handles.
 */
function levelSummary(values: OnboardingValues): string {
  if (values.role === "class_adviser") {
    return values.advisories
      .map((a) => `${gradeLevelLabel(a.gradeLevel)} ${a.sectionName}`)
      .join(", ");
  }
  return values.gradeLevel ? gradeLevelLabel(values.gradeLevel) : "";
}

/** How long the celebration holds before the dashboard takes over. */
const DONE_MS = 1500;

function AllSet({ firstName }: { firstName: string }) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      motionSafe(() => {
        gsap
          .timeline()
          .from(".done-badge", {
            scale: 0.3,
            autoAlpha: 0,
            duration: 0.6,
            ease: EASE.pop,
          })
          .from(
            ".done-line",
            {
              autoAlpha: 0,
              y: 12,
              duration: DURATION.base,
              ease: EASE.out,
              stagger: 0.08,
            },
            "-=0.3",
          );
      });
    },
    { scope },
  );

  return (
    <div ref={scope} className="grid min-h-[19rem] place-items-center py-6 text-center">
      <div>
        <span className="done-badge mx-auto grid size-16 place-items-center rounded-full bg-success/10 text-success">
          <Check className="size-8" strokeWidth={3} />
        </span>
        <h1 className="done-line mt-5 text-xl font-semibold tracking-tight">
          You&rsquo;re all set{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="done-line mt-1.5 text-sm text-muted-foreground">
          Taking you to your classes…
        </p>
      </div>
    </div>
  );
}

/**
 * The four-step wizard a teacher walks once, straight after signing up.
 *
 * All four steps share a single react-hook-form instance, and Continue
 * validates only the fields belonging to the step on screen
 * (ONBOARDING_STEP_FIELDS). Nothing is sent until the last step, so a teacher
 * who closes the tab halfway simply starts over rather than leaving a partial
 * profile the rest of the app has to allow for.
 */
export function Onboarding() {
  const { teacher, loading, completeOnboarding } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [roster, setRoster] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const errorRef = useShake<HTMLParagraphElement>(formError);

  // Flipped synchronously, before the request that sets `onboardedAt`, so the
  // "already onboarded" redirect below cannot fire in the render between the
  // save landing and the celebration appearing.
  const finishing = useRef(false);

  const form = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
    // Same rule as signup: validate a field once it has been left, then live.
    mode: "onTouched",
    defaultValues: {
      region: undefined,
      division: "",
      schoolId: "",
      schoolName: "",
      // Nearly always the right answer, and one fewer decision to make.
      schoolYear: currentSchoolYear(),
      schoolHead: "",
      role: undefined,
      gradeLevel: undefined,
      advisories: [],
    },
  });

  useEffect(() => {
    if (!finished) return;
    const timer = setTimeout(() => navigate("/", { replace: true }), DONE_MS);
    return () => clearTimeout(timer);
  }, [finished, navigate]);

  if (loading) return null;
  if (!teacher) return <Navigate to="/login" replace />;
  if (teacher.onboardedAt && !finishing.current) return <Navigate to="/" replace />;

  async function goNext() {
    const fields = onboardingStepFields(step, form.getValues("role"));
    const valid = await form.trigger(fields, { shouldFocus: true });
    if (!valid) return;

    setFormError(null);
    setDirection(1);
    setStep((s) => Math.min(s + 1, LAST));
  }

  function goBack() {
    setFormError(null);
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function save(values: OnboardingValues) {
    setFormError(null);
    finishing.current = true;

    try {
      await completeOnboarding(values);
      setFinished(true);
      toast.success("School details saved", {
        description: `${values.schoolName} · ${levelSummary(values)}`,
      });
    } catch (err) {
      finishing.current = false;
      setFormError(err instanceof Error ? err.message : "Could not save your details");
    }
  }

  // Continue is the form's submit button, so Enter in any field advances a
  // step instead of posting a half-filled wizard.
  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step < LAST) {
      void goNext();
      return;
    }
    void form.handleSubmit(save)();
  }

  // Radix's Select and the role cards never fire a blur, so under `onTouched`
  // an error raised by Continue would sit there unchanged after the teacher
  // has answered. Validating on change clears it the moment it is fixed.
  function answer<K extends FieldPath<OnboardingValues>>(name: K) {
    return (value: PathValue<OnboardingValues, K>) =>
      form.setValue(name, value, { shouldValidate: true, shouldTouch: true });
  }

  /**
   * Picking a role decides which question step 3 asks, so it also prepares
   * that step: an adviser gets an empty advisory row to fill in, a floating
   * teacher gets a single grade level. The branch not taken is cleared, so
   * changing your mind here cannot leave the old answer behind for the
   * server to reject.
   */
  function onRoleChange(role: OnboardingValues["role"]) {
    answer("role")(role);

    if (role === "class_adviser") {
      form.setValue("gradeLevel", undefined);
      if (form.getValues("advisories").length === 0) {
        form.setValue("advisories", [{ gradeLevel: undefined as never, sectionName: "" }]);
      }
    } else {
      form.setValue("advisories", []);
    }
  }

  const role = form.watch("role");
  const adviser = role === "class_adviser";

  const steps = stepLabels(adviser);

  const copy =
    step === 2 && adviser
      ? {
          title: "Which classes do you advise?",
          subtitle:
            "Add each section you handle. The same grade level twice is fine — name the sections differently.",
        }
      : COPY[step];

  const submitting = form.formState.isSubmitting;
  const firstName = teacher.fullName?.split(" ")[0] ?? "";

  if (finished) {
    return (
      <OnboardingLayout steps={steps} current={LAST} footer={<span className="sr-only" />}>
        <AllSet firstName={firstName} />
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout
      steps={steps}
      current={step}
      footer={
        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={goBack}
            disabled={step === 0 || submitting}
            // Held in the layout on step 1 so the row does not reflow the
            // moment it becomes usable on step 2.
            className={step === 0 ? "invisible" : undefined}
          >
            <ArrowLeft />
            Back
          </Button>

          <div className="flex items-center gap-2">
            {step === LAST && (
              <Button
                type="submit"
                form="onboarding-form"
                variant="ghost"
                disabled={submitting}
                // Skipping is finishing without the file, not finishing later,
                // so it submits the same wizard with the roster dropped.
                onClick={() => setRoster(null)}
              >
                Skip for now
              </Button>
            )}

            <Button
              type="submit"
              form="onboarding-form"
              disabled={submitting}
              className="transition-transform hover:-translate-y-px active:translate-y-0"
            >
              {submitting && <Loader2 className="animate-spin" />}
              {step < LAST ? (
                <>
                  Continue
                  <ArrowRight />
                </>
              ) : submitting ? (
                "Finishing…"
              ) : (
                <>
                  <Sparkles />
                  Finish setup
                </>
              )}
            </Button>
          </div>
        </div>
      }
    >
      <Form {...form}>
        <form id="onboarding-form" onSubmit={onSubmit} noValidate>
          <StepPanel
            step={step}
            direction={direction}
            title={copy.title}
            subtitle={copy.subtitle}
          >
            {step === 0 && (
              <div className="grid items-start gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="region"
                  render={({ field }) => (
                    <FormItem data-step-item className="sm:col-span-2">
                      <FormLabel>Region</FormLabel>
                      <Select value={field.value} onValueChange={answer("region")}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Choose your region" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {REGIONS.map((r) => (
                            <SelectItem key={r.code} value={r.code}>
                              {r.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="division"
                  render={({ field }) => (
                    <FormItem data-step-item>
                      <FormLabel>Division</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Batangas City"
                          autoComplete="off"
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
                  name="schoolId"
                  render={({ field, fieldState }) => (
                    <FormItem data-step-item>
                      <FormLabel>School ID</FormLabel>
                      <FormControl>
                        <Input
                          inputMode="numeric"
                          placeholder="300123"
                          autoComplete="off"
                          className="tabular"
                          disabled={submitting}
                          {...field}
                        />
                      </FormControl>
                      {!fieldState.error && (
                        <FormDescription>
                          The number on your school&rsquo;s forms.
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="schoolName"
                  render={({ field }) => (
                    <FormItem data-step-item className="sm:col-span-2">
                      <FormLabel>School name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Batangas City National High School"
                          autoComplete="organization"
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
                  name="schoolYear"
                  render={({ field }) => (
                    <FormItem data-step-item>
                      <FormLabel>School year</FormLabel>
                      <Select value={field.value} onValueChange={answer("schoolYear")}>
                        <FormControl>
                          <SelectTrigger className="tabular w-full">
                            <SelectValue placeholder="Choose a school year" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {schoolYearOptions().map((year) => (
                            <SelectItem key={year} value={year} className="tabular">
                              S.Y. {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="schoolHead"
                  render={({ field }) => (
                    <FormItem data-step-item>
                      <FormLabel>School head</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Dr. Maria Santos"
                          autoComplete="off"
                          disabled={submitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {step === 1 && (
              <FormField
                control={form.control}
                name="role"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <RoleChoice
                      value={field.value}
                      onChange={onRoleChange}
                      invalid={Boolean(fieldState.error)}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {step === 2 && adviser && <AdvisoryList />}

            {step === 2 && !adviser && (
              <FormField
                control={form.control}
                name="gradeLevel"
                render={({ field }) => (
                  <FormItem data-step-item className="max-w-sm">
                    <FormLabel>Grade level</FormLabel>
                    <Select
                      value={field.value}
                      // Radix hands back a plain string; the options are built
                      // from GRADE_GROUPS, so it is always a grade code.
                      onValueChange={(value) => answer("gradeLevel")(value as GradeLevel)}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Choose a grade level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {GRADE_GROUPS.map((group) => (
                          <SelectGroup key={group.label}>
                            <SelectLabel>{group.label}</SelectLabel>
                            {group.options.map((option) => (
                              <SelectItem key={option.code} value={option.code}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {step === LAST && <RosterUpload file={roster} onChange={setRoster} />}

            {formError && (
              <p
                ref={errorRef}
                role="alert"
                className="mt-5 rounded-md border border-destructive/25 bg-destructive/8 px-3 py-2 text-sm text-destructive"
              >
                {formError}
              </p>
            )}
          </StepPanel>
        </form>
      </Form>
    </OnboardingLayout>
  );
}
