/**
 * Password hashing and session signing using only Web Crypto, which is what
 * Workers gives us — no native bcrypt/argon2 binary to ship.
 *
 * OWASP recommends 600,000 iterations for PBKDF2-HMAC-SHA256, but workerd
 * refuses any single deriveBits call above 100,000 — it throws
 * "Pbkdf2 failed: iteration counts above 100000 are not supported", which
 * surfaces as a 500 on every signup. Six chained passes of 100,000 reach the
 * same total work: each pass is keyed by the previous pass's output, so the
 * chain is strictly sequential and an attacker still pays 600,000 HMAC
 * iterations per candidate password.
 */

/** workerd's per-call ceiling. Raising this past 100,000 breaks every hash. */
const PASS_ITERATIONS = 100_000;
/** 6 x 100,000 = the 600,000 OWASP asks for with SHA-256. */
const PASSES = 6;
const KEY_LENGTH_BITS = 256;
const SALT_BYTES = 16;

/** Both the per-pass count and the pass count are stored, so a later change to
 *  either still verifies the passwords hashed before it. */
const SCHEME = "pbkdf2-chain";

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derive(password, salt);
  return `${SCHEME}$${PASS_ITERATIONS}$${PASSES}$${toBase64(salt)}$${toBase64(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, iterations, passes, saltB64, hashB64] = stored.split("$");
  if (scheme !== SCHEME || !iterations || !passes || !saltB64 || !hashB64) return false;

  const salt = fromBase64(saltB64);
  const expected = fromBase64(hashB64);
  const actual = await derive(password, salt, Number(iterations), Number(passes));
  return timingSafeEqual(actual, expected);
}

/**
 * PBKDF2 applied `passes` times, each pass re-keyed with the previous pass's
 * output. Chaining rather than one long call is forced by the 100,000-iteration
 * ceiling above; the salt is constant throughout, so the work is
 * iterations x passes.
 */
async function derive(
  password: string,
  salt: Uint8Array,
  iterations = PASS_ITERATIONS,
  passes = PASSES,
): Promise<Uint8Array> {
  let material: BufferSource = new TextEncoder().encode(password);
  for (let i = 0; i < passes; i++) {
    material = await pbkdf2(material, salt, iterations);
  }
  return material as Uint8Array;
}

async function pbkdf2(
  keyMaterial: BufferSource,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", keyMaterial, "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    KEY_LENGTH_BITS,
  );
  return new Uint8Array(bits);
}

/** HMAC-SHA256 over the session id, so a forged cookie can't name another session. */
export async function signSessionId(sessionId: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(sessionId));
  return `${sessionId}.${toBase64(new Uint8Array(sig))}`;
}

export async function verifySessionCookie(
  cookie: string,
  secret: string,
): Promise<string | null> {
  const dot = cookie.lastIndexOf(".");
  if (dot < 0) return null;
  const sessionId = cookie.slice(0, dot);
  const expected = await signSessionId(sessionId, secret);
  return timingSafeEqual(
    new TextEncoder().encode(cookie),
    new TextEncoder().encode(expected),
  )
    ? sessionId
    : null;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}
