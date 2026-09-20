import { useRef } from "react";
import { gsap, motionSafe, useGSAP } from "@/lib/motion";

/**
 * Shakes an element whenever `trigger` changes to a truthy value.
 *
 * Used for submit failures. The message itself carries the meaning — this only
 * draws the eye to it, which matters when the message appears above a button
 * the teacher is already looking at.
 */
export function useShake<T extends HTMLElement = HTMLDivElement>(trigger: unknown) {
  const ref = useRef<T>(null);

  useGSAP(
    () => {
      if (!trigger || !ref.current) return;

      motionSafe(() => {
        gsap.fromTo(
          ref.current,
          { x: -9 },
          { x: 0, duration: 0.6, ease: "elastic.out(1, 0.4)", clearProps: "x" },
        );
      });
    },
    { dependencies: [trigger] },
  );

  return ref;
}
