import { useRef, type ReactNode } from "react";
import { DURATION, EASE, gsap, motionSafe, useGSAP } from "@/lib/motion";
import { AuroraBackdrop } from "@/components/motion/AuroraBackdrop";
import { Brand } from "@/components/Brand";
import { Card, CardContent } from "@/components/ui/card";

/**
 * The shared frame for sign in and sign up: aurora backdrop, brand, and a card
 * whose heading, fields and footer arrive in sequence.
 *
 * The stagger targets `[data-auth-item]` rather than the card's direct
 * children so each page can decide what counts as a step.
 */
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      motionSafe(() => {
        const tl = gsap.timeline();

        tl.from(".auth-card", {
          autoAlpha: 0,
          y: 28,
          scale: 0.97,
          duration: DURATION.slow,
          ease: EASE.out,
        }).from(
          "[data-auth-item]",
          {
            autoAlpha: 0,
            y: 14,
            duration: DURATION.base,
            ease: EASE.out,
            stagger: 0.07,
          },
          "-=0.55",
        );
      });
    },
    { scope },
  );

  return (
    <div ref={scope} className="relative grid min-h-dvh place-items-center overflow-hidden px-4 py-10">
      <AuroraBackdrop />

      <div className="relative w-full max-w-[25rem]">
        <Card className="auth-card border-border/70 shadow-xl shadow-primary/5">
          <CardContent className="px-6 py-2 sm:px-8">
            <div className="mb-7 text-center">
              <div data-auth-item className="mb-5 flex justify-center">
                <Brand animate />
              </div>
              <h1 data-auth-item className="text-xl font-semibold tracking-tight">
                {title}
              </h1>
              <p data-auth-item className="mt-1 text-sm text-muted-foreground">
                {subtitle}
              </p>
            </div>

            {children}

            <div data-auth-item className="mt-6 text-center text-sm text-muted-foreground">
              {footer}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
