import type { ReactNode } from "react";
import { Link } from "react-router";
import { APP_URL } from "../config";

export function Shell({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="nav">
        <Link to="/" className="brand">
          DepEd<span>ToolKit</span>
        </Link>
        <nav>
          <Link to="/pricing">Pricing</Link>
          <a className="btn btn-sm" href={`${APP_URL}/login`}>
            Sign in
          </a>
        </nav>
      </header>
      <main>{children}</main>
      <footer>
        <p>&copy; {new Date().getFullYear()} DepEd ToolKit. Made for Filipino teachers.</p>
      </footer>
    </>
  );
}
