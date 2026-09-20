/**
 * Shared GSAP setup.
 *
 * Two rules hold everywhere in this app:
 *
 *  1. Animation is opt-in per visitor. Every timeline is built inside
 *     `motionSafe`, which runs only under `prefers-reduced-motion:
 *     no-preference`. When motion is reduced the callback never fires, so the
 *     elements simply keep their natural styles — there is no "animate to
 *     zero duration" fallback to get wrong.
 *  2. Timelines are built inside `useGSAP`, which wraps them in a
 *     `gsap.context` and reverts on unmount. Because it runs in a layout
 *     effect, `gsap.from()` start states are applied before the browser
 *     paints, so there is no flash of the end state.
 */
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/** Shared easing vocabulary, so motion feels like one system. */
export const EASE = {
  /** Decelerate into place — the default for anything entering. */
  out: "power3.out",
  /** Symmetric, for things that move between two states. */
  inOut: "power2.inOut",
  /** Slight overshoot, for elements that should feel physical. */
  spring: "back.out(1.6)",
  /** Heavier overshoot for small, playful accents. */
  pop: "back.out(2.4)",
} as const;

export const DURATION = {
  fast: 0.25,
  base: 0.5,
  slow: 0.9,
  drift: 14,
} as const;

/**
 * Build a timeline only when the visitor has not asked for reduced motion.
 *
 * Called inside a `useGSAP` callback, the matchMedia instance is owned by that
 * hook's context and torn down with it. It also re-evaluates live, so toggling
 * the OS setting takes effect without a reload.
 */
export function motionSafe(build: (context: gsap.Context) => void) {
  return gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", build);
}

export { gsap, ScrollTrigger, useGSAP };
