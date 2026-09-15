import { Link } from "react-router";
import { Shell } from "../components/Shell";

export function NotFound() {
  return (
    <Shell>
      <section className="hero">
        <h1>Page not found</h1>
        <p className="lede">That page does not exist.</p>
        <Link className="btn" to="/">
          Back home
        </Link>
      </section>
    </Shell>
  );
}
