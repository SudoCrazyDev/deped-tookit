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

  return (
    <AppShell>
      <PageTransition>
        <Outlet />
      </PageTransition>
    </AppShell>
  );
}
