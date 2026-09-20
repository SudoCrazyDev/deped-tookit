/**
 * Turnstile sitekey for the signup widget.
 *
 * The sitekey is public by design — it is visible in the page source either
 * way, and it is the *secret* on the API side that makes the check meaningful.
 *
 * The fallback is Cloudflare's official always-passes test key, so a fresh
 * clone runs without any setup. That is safe because it only affects which
 * widget the browser draws: the server verifies against TURNSTILE_SECRET_KEY,
 * and a real secret rejects a dummy token outright.
 */
const TEST_SITE_KEY = "1x00000000000000000000AA";

export const TURNSTILE_SITE_KEY =
  import.meta.env.VITE_TURNSTILE_SITE_KEY || TEST_SITE_KEY;
