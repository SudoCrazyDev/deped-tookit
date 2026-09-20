import { useRef, type ElementType, type ReactNode } from "react";
import { DURATION, EASE, gsap, motionSafe, useGSAP } from "@/lib/motion";
import { cn } from "@/lib/utils";

type StaggerProps = {
  children: ReactNode;
  /** Which descendants to animate. Defaults to the direct children. */
  selector?: string;
  /** Seconds between each item. */
  each?: number;
  /** Seconds to wait before the first item. */
  delay?: number;
  /** Wait until the group scrolls into view instead of animating on mount. */
  onScroll?: boolean;
  as?: ElementType;
  className?: string;
};

/**
 * Reveals a group of elements one after another.
 *
 * Long class lists are the common case (a teacher can have a dozen sections),
 * so `onScroll` defers the reveal to a ScrollTrigger rather than animating
 * rows the teacher cannot see yet.
 */
export function Stagger({
  children,
  selector = ":scope > *",
  each = 0.06,
  delay = 0,
  onScroll = false,
  as: Tag = "div",
  className,
}: StaggerProps) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      motionSafe(() => {
        const items = gsap.utils.toArray<HTMLElement>(selector, scope.current);
        if (!items.length) return;

        gsap.from(items, {
          autoAlpha: 0,
          y: 18,
          duration: DURATION.base,
          ease: EASE.out,
          delay,
          stagger: each,
          ...(onScroll
            ? { scrollTrigger: { trigger: scope.current, start: "top 85%", once: true } }
            : {}),
        });
      });
    },
    { dependencies: [children], revertOnUpdate: true, scope },
  );

  return (
    <Tag ref={scope} className={cn(className)}>
      {children}
    </Tag>
  );
}
