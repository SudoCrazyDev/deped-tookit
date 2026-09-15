import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../lib/auth";
import { AppShell } from "./AppShell";

export function RequireAuth() {
  const { teacher, loading } = useAuth();
  const location = useLocation();

  if (loading) return <p className="center muted">Loading…</p>;
  if (!teacher) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
