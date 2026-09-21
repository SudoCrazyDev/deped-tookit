import { useRef } from "react";
import { BookMarked, Check, Users } from "lucide-react";
import { TEACHER_ROLES } from "@/lib/deped";
import type { TeacherRole } from "@/lib/types";
import { EASE, gsap, motionSafe, useGSAP } from "@/lib/motion";
import { cn } from "@/lib/utils";

const ICONS: Record<TeacherRole, typeof Users> = {
  class_adviser: Users,
  floating_teacher: BookMarked,
};

/**
 * The two cards in step 2, as a proper radio group.
 *
 * Cards rather than a dropdown because there are only two answers and the
 * difference between them needs a sentence to explain — a teacher should be
 * able to read both and click, not pick a label and hope.
 *
 * `role="radio"` brings an expectation of arrow-key navigation with it, so
 * that is wired up; only the selected card is in the tab order, which is what
 * a radio group is supposed to do.
 */
export function RoleChoice({
  value,
  onChange,
  invalid,
}: {
  value: TeacherRole | undefined;
  onChange: (role: TeacherRole) => void;
  invalid?: boolean;
}) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!value) return;

      motionSafe(() => {
        gsap.from(`[data-tick="${value}"]`, {
          scale: 0.2,
          autoAlpha: 0,
          duration: 0.4,
          ease: EASE.pop,
        });
      });
    },
    { scope, dependencies: [value] },
  );

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
    if (!keys.includes(e.key)) return;

    e.preventDefault();
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
    const at = TEACHER_ROLES.findIndex((r) => r.code === value);
    // No selection yet: the first arrow press picks an end rather than the
    // card next to an imaginary cursor.
    const next = at === -1 ? (step === 1 ? 0 : TEACHER_ROLES.length - 1) : at + step;
    const picked = TEACHER_ROLES[(next + TEACHER_ROLES.length) % TEACHER_ROLES.length];

    onChange(picked.code);
    scope.current
      ?.querySelector<HTMLButtonElement>(`[data-role="${picked.code}"]`)
      ?.focus();
  }

  return (
    <div
      ref={scope}
      role="radiogroup"
      aria-label="How do you teach?"
      aria-invalid={invalid || undefined}
      onKeyDown={onKeyDown}
      className="grid gap-3 sm:grid-cols-2"
    >
      {TEACHER_ROLES.map((role, i) => {
        const Icon = ICONS[role.code];
        const selected = value === role.code;

        return (
          <button
            key={role.code}
            type="button"
            role="radio"
            data-role={role.code}
            data-step-item
            aria-checked={selected}
            // Roving tabindex: before anything is picked the first card is the
            // one Tab lands on.
            tabIndex={selected || (!value && i === 0) ? 0 : -1}
            onClick={() => onChange(role.code)}
            className={cn(
              "group relative flex h-full flex-col items-start gap-3 rounded-xl border-2 bg-card p-5 text-left transition-all outline-none",
              "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
              "focus-visible:ring-[3px] focus-visible:ring-ring/50",
              selected
                ? "border-primary bg-accent/40 shadow-md"
                : invalid
                  ? "border-destructive/40"
                  : "border-border",
            )}
          >
            <span
              className={cn(
                "grid size-10 place-items-center rounded-lg transition-colors",
                selected
                  ? "bg-primary text-primary-foreground"
                  : "bg-primary/10 text-primary",
              )}
            >
              <Icon className="size-5" />
            </span>

            <span>
              <span className="block font-medium">{role.title}</span>
              <span className="mt-1 block text-sm text-muted-foreground">
                {role.description}
              </span>
            </span>

            {selected && (
              <span
                data-tick={role.code}
                aria-hidden="true"
                className="absolute top-3 right-3 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground"
              >
                <Check className="size-3" strokeWidth={3} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
