import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { api } from "../lib/api";
import type { Section, Student } from "../lib/types";

export function SectionDetail() {
  const { sectionId } = useParams<{ sectionId: string }>();

  const { data, isPending, error } = useQuery({
    queryKey: ["section", sectionId],
    queryFn: () =>
      api.get<{ section: Section; students: Student[] }>(`/sections/${sectionId}`),
    enabled: Boolean(sectionId),
  });

  if (isPending) return <p className="muted">Loading…</p>;
  if (error) return <p className="error">{error.message}</p>;

  return (
    <>
      <Link to="/" className="back muted">
        ← All classes
      </Link>
      <div className="page-head">
        <h1>
          Grade {data.section.gradeLevel} — {data.section.name}
        </h1>
        <button className="btn btn-sm">Add student</button>
      </div>
      <p className="muted">
        {data.section.subject} · S.Y. {data.section.schoolYear}
      </p>

      <table className="grid">
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>LRN</th>
            <th>Sex</th>
          </tr>
        </thead>
        <tbody>
          {data.students.map((s, i) => (
            <tr key={s.id}>
              <td className="muted">{i + 1}</td>
              <td>
                {s.lastName}, {s.firstName} {s.middleName ?? ""}
              </td>
              <td className="mono">{s.lrn ?? "—"}</td>
              <td>{s.sex}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.students.length === 0 && <p className="muted">No students in this class yet.</p>}
    </>
  );
}
