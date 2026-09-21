import { useRef, type ReactNode } from "react";
import { DURATION, EASE, gsap, motionSafe, useGSAP } from "@/lib/motion";
import { AuroraBackdrop } from "@/components/motion/AuroraBackdrop";
import { Brand } from "@/components/Brand";
import { Card, CardContent } from "@/components/ui/card";
import { Stepper } from "./Stepper";

/**
 * The frame the whole wizard sits in: the same aurora-and-card look as sign in
 * and sign up, so finishing signup and starting setup feels like one stretch
 * of the same journey rather than a hand-off to a different product.
 *
 * Only the frame animates here, and only on mount. Everything that changes
 * from step to step is animated by StepPanel, keyed on the step index.
 */
export function OnboardingLayout({
  steps,
  current,
  children,
  footer,
}: {
  steps: string[];
  current: number;
  children: ReactNode;
  footer: ReactNode;
}) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      motionSafe(() => {
        gsap
          .timeline()
          .from(".onboarding-rail", {
            autoAlpha: 0,
            y: -12,
            duration: DURATION.base,
            ease: EASE.out,
          })
          .from(
            ".onboarding-card",
            {
              autoAlpha: 0,
              y: 26,
              scale: 0.98,
              duration: DURATION.slow,
              ease: EASE.out,
            },
            "-=0.3",
          );
      });
    },
    { scope },
  );

  return (
    <div ref={scope} className="relative min-h-dvh overflow-hidden px-4 py-8 sm:py-12">
      <AuroraBackdrop />

      <div className="relative mx-auto w-full max-w-2xl">
        <div className="mb-8 flex justify-center">
          <Brand animate />
        </div>

        <div className="onboarding-rail px-1">
          <Stepper steps={steps} current={current} />
        </div>

        <Card className="onboarding-card mt-7 gap-0 border-border/70 py-0 shadow-xl shadow-primary/5">
          <CardContent className="px-5 py-7 sm:px-8 sm:py-8">{children}</CardContent>
          <div className="border-t px-5 py-4 sm:px-8">{footer}</div>
        </Card>
      </div>
    </div>
  );
}
