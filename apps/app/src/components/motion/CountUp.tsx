import { useRef } from "react";
import { DURATION, EASE, gsap, motionSafe, useGSAP } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Counts from zero up to `value` when the element scrolls into view.
 *
 * The final value is also the rendered text, so with reduced motion — or if
 * the timeline never runs — the correct number is on screen either way.
 */
export function CountUp({
  value,
  className,
  duration = DURATION.slow,
}: {
  value: number;
  className?: string;
  duration?: number;
}) {
  const el = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const node = el.current;
      if (!node) return;

      motionSafe(() => {
        const counter = { n: 0 };
        gsap.to(counter, {
          n: value,
          duration,
          ease: EASE.out,
          snap: { n: 1 },
          scrollTrigger: { trigger: node, start: "top 90%", once: true },
          onUpdate: () => {
            node.textContent = String(Math.round(counter.n));
          },
          // The tween is reverted with the context on unmount; put the true
          // value back so a re-render never shows a half-counted number.
          onComplete: () => {
            node.textContent = String(value);
          },
        });
      });
    },
    { dependencies: [value], revertOnUpdate: true },
  );

  return (
    <span ref={el} className={cn("tabular", className)}>
      {value}
    </span>
  );
}
