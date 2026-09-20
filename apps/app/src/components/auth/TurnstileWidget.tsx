import { useEffect, useImperativeHandle, useRef, type Ref } from "react";

/**
 * Cloudflare Turnstile, rendered explicitly so the form can reset it.
 *
 * Explicit rendering (rather than the auto-rendered `.cf-turnstile` class) is
 * what makes `reset()` reachable. That matters more than it looks: a token is
 * single-use, so after any failed submit the spent token must be thrown away
 * or the retry fails with "timeout-or-duplicate" — the teacher fixes their
 * email, submits again, and gets a confusing second error.
 */

export type TurnstileHandle = { reset: () => void };

type TurnstileRenderOptions = {
  sitekey: string;
  callback: (token: string) => void;
  "error-callback": () => void;
  "expired-callback": () => void;
  "timeout-callback": () => void;
  theme: "light";
  appearance: "always" | "execute" | "interaction-only";
};

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: TurnstileRenderOptions) => string | undefined;
      reset: (id: string) => void;
      remove: (id: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

const SCRIPT_ID = "cf-turnstile-script";
const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad";

/** Resolves once the Turnstile script has loaded. Shared across mounts. */
let scriptReady: Promise<void> | null = null;

function loadTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (scriptReady) return scriptReady;

  scriptReady = new Promise<void>((resolve, reject) => {
    window.onTurnstileLoad = () => resolve();

    const existing = document.getElementById(SCRIPT_ID);
    if (existing) return;

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      // Let a later mount retry rather than caching the failure forever.
      scriptReady = null;
      reject(new Error("Could not load the human check"));
    };
    document.head.appendChild(script);
  });

  return scriptReady;
}

export function TurnstileWidget({
  siteKey,
  onToken,
  onError,
  ref,
}: {
  siteKey: string;
  /** Called with a token when solved, and with null when it expires or errors. */
  onToken: (token: string | null) => void;
  onError?: (message: string) => void;
  ref?: Ref<TurnstileHandle>;
}) {
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  // Held in refs so the render effect does not re-run — and tear the widget
  // down and back up — every time the parent re-renders with new callbacks.
  const onTokenRef = useRef(onToken);
  const onErrorRef = useRef(onError);
  onTokenRef.current = onToken;
  onErrorRef.current = onError;

  useImperativeHandle(ref, () => ({
    reset: () => {
      if (widgetId.current && window.turnstile) {
        window.turnstile.reset(widgetId.current);
        onTokenRef.current(null);
      }
    },
  }));

  useEffect(() => {
    let cancelled = false;

    loadTurnstile()
      .then(() => {
        if (cancelled || !container.current || !window.turnstile) return;

        widgetId.current =
          window.turnstile.render(container.current, {
            sitekey: siteKey,
            callback: (token) => onTokenRef.current(token),
            "error-callback": () => {
              onTokenRef.current(null);
              onErrorRef.current?.("The human check failed to load. Please try again.");
            },
            "expired-callback": () => onTokenRef.current(null),
            "timeout-callback": () => onTokenRef.current(null),
            theme: "light",
            appearance: "always",
          }) ?? null;
      })
      .catch((err: Error) => {
        if (!cancelled) onErrorRef.current?.(err.message);
      });

    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current);
        widgetId.current = null;
      }
    };
  }, [siteKey]);

  return <div ref={container} className="flex min-h-[65px] justify-center" />;
}
