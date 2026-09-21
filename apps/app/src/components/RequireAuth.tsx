import { Navigate, Outlet, useLocation } from "react-router";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AppShell } from "./AppShell";
import { PageTransition } from "./motion/PageTransition";

export function RequireAuth() {
  const { teacher, loading } = useAuth();
  const location = useLocation();

  // The session check is a single request against the same origin, so this is
  // usually one frame. A spinner rather than a skeleton avoids implying a
  // layout that may turn out to be the sign-in page instead.
  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
        <span className="sr-only">Loading</span>
      </div>
    );
  }

  if (!teacher) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Setup is the app's first screen, not an optional detour: the school header
  // and the grade level it collects are what every class record is printed
  // with. `onboardedAt` is only set once the wizard is finished, so a teacher
  // who abandoned it halfway lands back here.
  if (!teacher.onboardedAt) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <AppShell>
      <PageTransition>
        <Outlet />
      </PageTransition>
    </AppShell>
  );
}
