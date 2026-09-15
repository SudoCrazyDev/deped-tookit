import { Shell } from "../components/Shell";
import { APP_URL } from "../config";

export function Pricing() {
  return (
    <Shell>
      <section className="hero">
        <h1>Pricing</h1>
        <p className="lede">Free while we are in beta. Teachers who join now keep beta pricing.</p>
        <a className="btn" href={`${APP_URL}/signup`}>
          Create an account
        </a>
      </section>
    </Shell>
  );
}
