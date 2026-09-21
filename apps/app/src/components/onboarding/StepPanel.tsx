import { useRef, type ReactNode } from "react";
import { DURATION, EASE, gsap, motionSafe, useGSAP } from "@/lib/motion";

/**
 * One step's contents, animated in from whichever side the teacher came from.
 *
 * Only the arriving step is animated — the leaving one unmounts. A cross-fade
 * would mean rendering both at once, and with fields of different heights that
 * makes the card jump around more than the transition is worth. `minHeight`
 * holds the card steady instead.
 *
 * Written as `fromTo` rather than `from`, and with `clearProps` at the end,
 * for a reason worth keeping: a plain `gsap.from` reads its end value off the
 * element at build time. Steps 2 to 4 mount children in the same commit that
 * changes the step, so the tween can be built twice in quick succession — and
 * the second build snapshots the opacity the first one had already set to 0,
 * leaving an element that animates from hidden to hidden. Naming both ends
 * makes the result the same however many times it runs, and `clearProps`
 * hands the elements back with no inline styles at all.
 */
export function StepPanel({
  step,
  direction,
  title,
  subtitle,
  children,
}: {
  /** Index of the step being shown; changing it replays the animation. */
  step: number;
  /** 1 when moving forward, -1 when going back. Sets which side it enters on. */
  direction: 1 | -1;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      motionSafe(() => {
        const settled = { clearProps: "transform,opacity,visibility" };

        gsap
          .timeline()
          .fromTo(
            scope.current,
            { autoAlpha: 0, x: 34 * direction },
            {
              autoAlpha: 1,
              x: 0,
              duration: DURATION.base,
              ease: EASE.out,
              ...settled,
            },
          )
          .fromTo(
            "[data-step-item]",
            { autoAlpha: 0, y: 14 },
            {
              autoAlpha: 1,
              y: 0,
              duration: DURATION.base,
              ease: EASE.out,
              stagger: 0.055,
              ...settled,
            },
            "-=0.3",
          );
      });
    },
    { scope, dependencies: [step], revertOnUpdate: true },
  );

  return (
    <div ref={scope} className="min-h-[19rem]">
      <div className="mb-6">
        <h1 data-step-item className="text-xl font-semibold tracking-tight">
          {title}
        </h1>
        <p data-step-item className="mt-1 text-sm text-muted-foreground">
          {subtitle}
        </p>
      </div>

      {children}
    </div>
  );
}
