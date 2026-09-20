import { useRef } from "react";
import { DURATION, gsap, motionSafe, useGSAP } from "@/lib/motion";

/**
 * Slow-drifting colour wash behind the auth pages.
 *
 * Purely decorative and `aria-hidden`. The blobs are laid out so the static
 * composition already looks intentional — the drift is a bonus for people who
 * accept motion, not the thing that makes it look right.
 */
export function AuroraBackdrop() {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      motionSafe(() => {
        const blobs = gsap.utils.toArray<HTMLElement>(".aurora-blob", scope.current);

        blobs.forEach((blob, i) => {
          gsap.to(blob, {
            xPercent: gsap.utils.random(-18, 18),
            yPercent: gsap.utils.random(-16, 16),
            scale: gsap.utils.random(0.9, 1.15),
            duration: DURATION.drift + i * 3,
            ease: "sine.inOut",
            repeat: -1,
            yoyo: true,
            delay: i * 0.8,
          });
        });
      });
    },
    { scope },
  );

  return (
    <div
      ref={scope}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="aurora-blob absolute -top-40 -left-32 size-[34rem] rounded-full bg-primary/12 blur-3xl" />
      <div className="aurora-blob absolute -top-24 right-[-10rem] size-[30rem] rounded-full bg-chart-2/12 blur-3xl" />
      <div className="aurora-blob absolute bottom-[-14rem] left-1/3 size-[32rem] rounded-full bg-chart-3/10 blur-3xl" />
    </div>
  );
}
