import { useRef } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { GRADE_GROUPS } from "@/lib/deped";
import type { OnboardingValues } from "@/lib/validation";
import { EASE, gsap, motionSafe, useGSAP } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FormControl,
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

const MAX_ADVISORIES = 20;

/**
 * Step 3 for a class adviser: the sections they advise, one row each.
 *
 * A grade level on its own is not enough here, because an adviser can hold two
 * advisories at the same level — Grade 7 Rizal and Grade 7 Mabini are two
 * different classes. So the level is paired with the section's name, and the
 * same level may appear more than once; only a repeated level *and* name is
 * rejected, which the schema does.
 *
 * The rows are a react-hook-form field array, so each one carries its own
 * errors and the Continue button validates the whole list in one call.
 */
export function AdvisoryList() {
  const form = useFormContext<OnboardingValues>();
  const scope = useRef<HTMLDivElement>(null);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "advisories",
  });

  // Animate only the row just added. Keyed on the count rather than the array
  // so removing a row does not replay the others.
  useGSAP(
    () => {
      if (fields.length < 2) return;

      motionSafe(() => {
        gsap.fromTo(
          `[data-advisory="${fields.length - 1}"]`,
          { autoAlpha: 0, y: -8 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.4,
            ease: EASE.spring,
            clearProps: "transform,opacity,visibility",
          },
        );
      });
    },
    { scope, dependencies: [fields.length] },
  );

  // The list-level message ("Add at least one advisory class") hangs off the
  // array itself, not off any row.
  const listError = form.formState.errors.advisories?.root?.message;

  return (
    <div ref={scope} data-step-item className="space-y-3">
      {fields.map((field, index) => (
        <div
          key={field.id}
          data-advisory={index}
          className="grid gap-3 rounded-xl border bg-card/60 p-3 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_auto] sm:items-start"
        >
          <FormField
            control={form.control}
            name={`advisories.${index}.gradeLevel`}
            render={({ field: grade }) => (
              <FormItem>
                {/* Labelled on every row for screen readers, shown once. */}
                <FormLabel className={index === 0 ? undefined : "sr-only"}>
                  Grade level
                </FormLabel>
                <Select value={grade.value} onValueChange={grade.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Grade level" />
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

          <FormField
            control={form.control}
            name={`advisories.${index}.sectionName`}
            render={({ field: section }) => (
              <FormItem>
                <FormLabel className={index === 0 ? undefined : "sr-only"}>
                  Section name
                </FormLabel>
                <FormControl>
                  <Input placeholder="Rizal" autoComplete="off" {...section} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className={index === 0 ? "sm:pt-[1.625rem]" : undefined}>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              // The list must keep one row: emptying it entirely would leave
              // the teacher with nothing to fill in and no obvious way back.
              disabled={fields.length === 1}
              onClick={() => remove(index)}
              aria-label={`Remove advisory ${index + 1}`}
            >
              <Trash2 />
            </Button>
          </div>
        </div>
      ))}

      {listError && (
        <p role="alert" className="text-sm text-destructive">
          {listError}
        </p>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={fields.length >= MAX_ADVISORIES}
        onClick={() => append({ gradeLevel: undefined as never, sectionName: "" })}
      >
        <Plus />
        Add another advisory
      </Button>
    </div>
  );
}
