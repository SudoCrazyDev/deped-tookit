import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { HTTPException } from "hono/http-exception";
import type { Env } from "./types";
import { auth } from "./routes/auth";
import { sections } from "./routes/sections";
import { onboarding } from "./routes/onboarding";
import { assessments } from "./routes/assessments";
import { grades } from "./routes/grades";

const app = new Hono<Env>().basePath("/api");

app.use("*", logger());
app.use("*", secureHeaders());

// The app frontend is served from its own worker, so credentialed requests need
// an explicit origin allowance. APP_ORIGIN is set per environment.
app.use("*", (c, next) =>
  cors({
    origin: c.env.APP_ORIGIN,
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })(c, next),
);

app.get("/health", (c) => c.json({ ok: true }));

app.route("/auth", auth);
app.route("/onboarding", onboarding);
app.route("/sections", sections);
app.route("/", assessments);
app.route("/", grades);

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  console.error(err);
  return c.json({ error: "Internal server error" }, 500);
});

app.notFound((c) => c.json({ error: "Not found" }, 404));

export default app;

/** Exported so the frontend can adopt Hono's typed RPC client later if wanted. */
export type AppType = typeof app;
