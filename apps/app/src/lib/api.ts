// Thin typed wrapper over fetch. Base URL is empty in dev so the Vite proxy
// forwards /api to the local worker; in production it points at the API worker.
const BASE = import.meta.env.VITE_API_URL ?? "";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Pull something a teacher can read out of an error response.
 *
 * The API speaks two dialects. Handlers throw HTTPException, which serialises
 * as `{ error: "That email is already registered" }`. Requests rejected by
 * zValidator never reach a handler and serialise as
 * `{ error: { name: "ZodError", message: "<JSON array of issues>" } }`.
 * Reading `body.error` blindly turns the second kind into "[object Object]".
 */
function readErrorMessage(body: unknown, fallback: string): string {
  if (typeof body !== "object" || body === null || !("error" in body)) return fallback;

  const { error } = body as { error: unknown };
  if (typeof error === "string") return error;

  if (typeof error === "object" && error !== null && "message" in error) {
    const { message } = error as { message: unknown };
    if (typeof message !== "string") return fallback;

    // ZodError.message is a JSON array of issues; surface the first one.
    try {
      const issues = JSON.parse(message) as Array<{ message?: string }>;
      const first = issues.find((i) => typeof i.message === "string");
      if (first?.message) return first.message;
    } catch {
      // Not the nested-JSON form — the message is already plain text.
    }
    return message;
  }

  return fallback;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, readErrorMessage(body, res.statusText));
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
