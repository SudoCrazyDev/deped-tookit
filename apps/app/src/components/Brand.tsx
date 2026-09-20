import { useRef } from "react";
import { DURATION, EASE, gsap, motionSafe, useGSAP } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * The wordmark, drawn with the same glyph as the favicon.
 *
 * `animate` draws the mark's stroke on and pops the badge in — worth it on the
 * auth pages, where it is the first thing on screen, but noise in the app
 * header where it appears on every navigation.
 */
export function Brand({
  animate = false,
  className,
}: {
  animate?: boolean;
  className?: string;
}) {
  const scope = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      if (!animate) return;

      motionSafe(() => {
        const stroke = scope.current?.querySelector<SVGPathElement>(".brand-stroke");
        const length = stroke?.getTotalLength() ?? 0;

        const tl = gsap.timeline();
        tl.from(".brand-badge", {
          scale: 0.4,
          autoAlpha: 0,
          rotate: -18,
          duration: DURATION.base,
          ease: EASE.pop,
        });

        if (stroke && length) {
          tl.from(
            stroke,
            {
              strokeDasharray: length,
              strokeDashoffset: length,
              duration: DURATION.slow,
              ease: EASE.inOut,
              clearProps: "strokeDasharray,strokeDashoffset",
            },
            "-=0.25",
          );
        }

        tl.from(
          ".brand-word",
          { autoAlpha: 0, x: -8, duration: DURATION.base, ease: EASE.out },
          "-=0.5",
        );
      });
    },
    { scope, dependencies: [animate] },
  );

  return (
    <span
      ref={scope}
      className={cn(
        "inline-flex items-center gap-2 text-[1.0625rem] font-bold tracking-tight",
        className,
      )}
    >
      <svg viewBox="0 0 32 32" aria-hidden="true" className="brand-badge size-7 shrink-0">
        <rect width="32" height="32" rx="7" className="fill-primary" />
        <path
          className="brand-stroke"
          d="M9 9h8a7 7 0 0 1 0 14H9z"
          fill="none"
          stroke="#fff"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <span className="brand-word">
        DepEd<span className="text-primary"> ToolKit</span>
      </span>
    </span>
  );
}
