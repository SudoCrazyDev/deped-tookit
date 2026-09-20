import { useRef, type ReactNode } from "react";
import { useLocation } from "react-router";
import { DURATION, EASE, gsap, motionSafe, useGSAP } from "@/lib/motion";

/**
 * Fades and lifts route content on each navigation.
 *
 * Keyed on the pathname with `revertOnUpdate`, so the previous route's inline
 * transforms are cleared before the next one animates in — otherwise a fast
 * back-and-forth leaves a half-applied transform behind.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      motionSafe(() => {
        gsap.from(scope.current, {
          autoAlpha: 0,
          y: 14,
          duration: DURATION.base,
          ease: EASE.out,
        });
      });
    },
    { dependencies: [pathname], revertOnUpdate: true, scope },
  );

  return <div ref={scope}>{children}</div>;
}
