import { useRef } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { GRADE_GROUPS } from "@/lib/deped";
import { MAX_ASSIGNMENTS, type OnboardingValues } from "@/lib/validation";
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

/** A row the teacher has not filled in yet. */
export const BLANK_ASSIGNMENT = {
  gradeLevel: undefined as never,
  sectionName: "",
};

/**
 * Step 3's answer: the classes a teacher handles, a grade level and a section
 * name each.
 *
 * Both roles answer in the same shape and differ only in how many rows they
 * get. A class adviser has one advisory — that is what the word means — so
 * `multiple` is false and the add and remove controls are gone entirely
 * rather than disabled, because there is no sense in which they might become
 * available. A floating teacher has no advisory and lists every section they
 * teach in, so they get the full list.
 *
 * A grade level on its own would not identify a class: a teacher can hold two
 * at the same level, and Grade 7 Rizal and Grade 7 Mabini are different
 * classes. Only a repeated level *and* name is rejected, which the schema does.
 */
export function AssignmentList({ multiple }: { multiple: boolean }) {
  const form = useFormContext<OnboardingValues>();
  const scope = useRef<HTMLDivElement>(null);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "assignments",
  });

  // Animate only the row just added. Keyed on the count rather than the array
  // so removing a row does not replay the others.
  useGSAP(
    () => {
      if (!multiple || fields.length < 2) return;

      motionSafe(() => {
        gsap.fromTo(
          `[data-assignment="${fields.length - 1}"]`,
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
    { scope, dependencies: [fields.length, multiple] },
  );

  // The list-level message ("Add the class you handle") hangs off the array
  // itself rather than any one row.
  const listError = form.formState.errors.assignments?.root?.message;

  return (
    <div ref={scope} data-step-item className="space-y-3">
      {fields.map((field, index) => (
        <div
          key={field.id}
          data-assignment={index}
          className={
            multiple
              ? "grid gap-3 rounded-xl border bg-card/60 p-3 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_auto] sm:items-start"
              : "grid max-w-lg gap-4 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)] sm:items-start"
          }
        >
          <FormField
            control={form.control}
            name={`assignments.${index}.gradeLevel`}
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
            name={`assignments.${index}.sectionName`}
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

          {multiple && (
            <div className={index === 0 ? "sm:pt-[1.625rem]" : undefined}>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                // The list must keep one row: emptying it entirely would leave
                // the teacher with nothing to fill in and no obvious way back.
                disabled={fields.length === 1}
                onClick={() => remove(index)}
                aria-label={`Remove class ${index + 1}`}
              >
                <Trash2 />
              </Button>
            </div>
          )}
        </div>
      ))}

      {listError && (
        <p role="alert" className="text-sm text-destructive">
          {listError}
        </p>
      )}

      {multiple && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={fields.length >= MAX_ASSIGNMENTS}
          onClick={() => append({ ...BLANK_ASSIGNMENT })}
        >
          <Plus />
          Add another class
        </Button>
      )}
    </div>
  );
}
