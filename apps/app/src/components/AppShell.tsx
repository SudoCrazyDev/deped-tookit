import type { ReactNode } from "react";
import { Link } from "react-router";
import { useAuth } from "../lib/auth";

export function AppShell({ children }: { children: ReactNode }) {
  const { teacher, logout } = useAuth();

  return (
    <>
      <header className="nav">
        <Link to="/" className="brand">
          DepEd<span>ToolKit</span>
        </Link>
        <div className="nav-right">
          <span className="muted">{teacher?.fullName}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => void logout()}>
            Sign out
          </button>
        </div>
      </header>
      <main>{children}</main>
    </>
  );
}
