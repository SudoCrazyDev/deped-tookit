/**
 * Password hashing and session signing using only Web Crypto, which is what
 * Workers gives us — no native bcrypt/argon2 binary to ship.
 *
 * PBKDF2-SHA256 at 210k iterations follows the OWASP 2023 recommendation.
 */

const ITERATIONS = 210_000;
const KEY_LENGTH_BITS = 256;
const SALT_BYTES = 16;

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await pbkdf2(password, salt);
  return `pbkdf2$${ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, iterations, saltB64, hashB64] = stored.split("$");
  if (scheme !== "pbkdf2") return false;

  const salt = fromBase64(saltB64);
  const expected = fromBase64(hashB64);
  const actual = await pbkdf2(password, salt, Number(iterations));
  return timingSafeEqual(actual, expected);
}

async function pbkdf2(
  password: string,
  salt: Uint8Array,
  iterations = ITERATIONS,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
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
