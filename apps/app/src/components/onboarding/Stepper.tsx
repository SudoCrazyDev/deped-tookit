import { useRef } from "react";
import { Check } from "lucide-react";
import { DURATION, EASE, gsap, motionSafe, useGSAP } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * The progress rail above the wizard.
 *
 * Two things move when the step changes: the fill creeps along the track, and
 * the node just reached pops while the one behind it swaps its number for a
 * check. The fill is the honest part — it is the teacher's answer to "how much
 * of this is left" — so it is sized from the step index, not eyeballed.
 *
 * Geometry: each step is a flex-1 column, so the first node's centre sits at
 * `50 / steps.length` percent from the left and the last the same from the
 * right. Insetting the track by that much makes it run centre-to-centre, and a
 * fill of `current / (steps.length - 1)` then lands exactly on a node.
 */
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  const scope = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLDivElement>(null);

  const inset = `${50 / steps.length}%`;
  const progress = steps.length > 1 ? current / (steps.length - 1) : 1;

  useGSAP(
    () => {
      const width = `${progress * 100}%`;
      let animated = false;

      motionSafe(() => {
        animated = true;

        gsap.to(fill.current, {
          width,
          duration: DURATION.base,
          ease: EASE.inOut,
          overwrite: true,
        });

        gsap.fromTo(
          `[data-node="${current}"]`,
          { scale: 0.7 },
          { scale: 1, duration: DURATION.base, ease: EASE.pop, overwrite: true },
        );
      });

      // matchMedia runs its callback synchronously when the query matches, so
      // an unset flag here means motion is reduced — put the fill straight at
      // its final width rather than leaving the rail empty.
      if (!animated) gsap.set(fill.current, { width });
    },
    { scope, dependencies: [current, progress] },
  );

  return (
    <div ref={scope}>
      <nav aria-label="Setup progress">
        <ol className="relative flex items-start">
          {/* Track and fill sit behind the nodes. */}
          <span
            aria-hidden="true"
            className="absolute top-3.5 h-0.5 rounded-full bg-border"
            style={{ left: inset, right: inset }}
          >
            <span ref={fill} className="block h-full w-0 rounded-full bg-primary" />
          </span>

          {steps.map((label, i) => {
            const done = i < current;
            const active = i === current;

            return (
              <li
                key={label}
                className="relative z-10 flex min-w-0 flex-1 flex-col items-center gap-2 px-1 text-center"
                aria-current={active ? "step" : undefined}
              >
                <span
                  data-node={i}
                  className={cn(
                    "grid size-[1.875rem] place-items-center rounded-full border-2 bg-card text-xs font-semibold transition-colors duration-300",
                    done && "border-primary bg-primary text-primary-foreground",
                    active && "border-primary text-primary ring-4 ring-primary/15",
                    !done && !active && "border-border text-muted-foreground",
                  )}
                >
                  {done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
                </span>

                <span
                  className={cn(
                    "text-[0.6875rem] leading-tight font-medium transition-colors duration-300 sm:text-xs",
                    // Four labels will not fit side by side on a phone, so off
                    // the small breakpoint only the current one is shown.
                    active ? "text-foreground" : "hidden text-muted-foreground sm:block",
                  )}
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ol>
      </nav>

      <p className="sr-only" role="status">
        Step {current + 1} of {steps.length}: {steps[current]}
      </p>
    </div>
  );
}
