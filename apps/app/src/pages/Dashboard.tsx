import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { api } from "../lib/api";
import type { Section } from "../lib/types";

export function Dashboard() {
  const { data, isPending, error } = useQuery({
    queryKey: ["sections"],
    queryFn: () => api.get<{ sections: Section[] }>("/sections"),
  });

  if (isPending) return <p className="muted">Loading your classes…</p>;
  if (error) return <p className="error">{error.message}</p>;

  return (
    <>
      <div className="page-head">
        <h1>My classes</h1>
        <button className="btn btn-sm">New class</button>
      </div>

      {data.sections.length === 0 ? (
        <p className="muted">No classes yet. Create one to start adding students.</p>
      ) : (
        <ul className="card-list">
          {data.sections.map((s) => (
            <li key={s.id}>
              <Link to={`/sections/${s.id}`}>
                <strong>
                  Grade {s.gradeLevel} — {s.name}
                </strong>
                <span className="muted">
                  {s.subject} · S.Y. {s.schoolYear} · {s.studentCount} students
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
