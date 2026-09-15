import { Shell } from "../components/Shell";
import { APP_URL } from "../config";

const FEATURES = [
  {
    title: "Class records that add themselves up",
    body: "Enter raw scores once. Written Work, Performance Tasks, and Quarterly Assessment percentages compute as you type.",
  },
  {
    title: "DepEd Order No. 8, s. 2015 built in",
    body: "Component weights per track and the official transmutation table are applied automatically — no formula rewiring every quarter.",
  },
  {
    title: "Your students, your data",
    body: "Each teacher's class list is private. Export to Excel or PDF whenever your school head asks for a copy.",
  },
  {
    title: "Works on the school laptop",
    body: "Runs in the browser, loads fast on slow connections, and keeps working on a shared computer.",
  },
];

export function Landing() {
  return (
    <Shell>
      <section className="hero">
        <p className="eyebrow">For Philippine public school teachers</p>
        <h1>Stop fighting your class record spreadsheet.</h1>
        <p className="lede">
          DepEd ToolKit keeps your students, scores, and quarterly grades in one place — and
          computes them the way DepEd actually requires.
        </p>
        <div className="cta-row">
          <a className="btn" href={`${APP_URL}/signup`}>
            Start free
          </a>
          <a className="btn btn-ghost" href="#features">
            See how it works
          </a>
        </div>
      </section>

      <section id="features" className="features">
        {FEATURES.map((f) => (
          <article key={f.title}>
            <h2>{f.title}</h2>
            <p>{f.body}</p>
          </article>
        ))}
      </section>
    </Shell>
  );
}
