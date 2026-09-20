/**
 * Cloudflare Turnstile verification.
 *
 * The widget on the signup form produces a token; this exchanges it with
 * Cloudflare for a verdict. The check is worthless without this step — a bot
 * can post straight to the API and skip the widget entirely, so the token is
 * verified server-side on every signup rather than trusted from the client.
 */

const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export type TurnstileVerdict =
  | { ok: true }
  /** Token was valid once but is past its 5 minutes, or has been used already. */
  | { ok: false; reason: "expired"; codes: string[] }
  /** Cloudflare rejected the token. */
  | { ok: false; reason: "failed"; codes: string[] }
  /** siteverify could not be reached or did not answer usefully. */
  | { ok: false; reason: "unavailable"; codes: string[] };

type SiteverifyResponse = {
  success?: boolean;
  "error-codes"?: string[];
};

export async function verifyTurnstile(
  secret: string,
  token: string,
  remoteIp?: string,
): Promise<TurnstileVerdict> {
  const form = new URLSearchParams({ secret, response: token });
  if (remoteIp) form.set("remoteip", remoteIp);

  let body: SiteverifyResponse;
  try {
    const res = await fetch(SITEVERIFY, { method: "POST", body: form });
    if (!res.ok) return { ok: false, reason: "unavailable", codes: [`http-${res.status}`] };
    body = (await res.json()) as SiteverifyResponse;
  } catch {
    return { ok: false, reason: "unavailable", codes: ["fetch-failed"] };
  }

  if (body.success) return { ok: true };

  const codes = body["error-codes"] ?? [];

  // A token is good for 300 seconds and is accepted exactly once. Both of those
  // land here, and both mean "get a fresh token" — which is a different thing
  // to tell a teacher than "you look like a bot".
  if (codes.includes("timeout-or-duplicate")) {
    return { ok: false, reason: "expired", codes };
  }
  return { ok: false, reason: "failed", codes };
}
