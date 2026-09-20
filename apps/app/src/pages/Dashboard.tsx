import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { BookOpen, GraduationCap, Layers, Plus, Search, Users } from "lucide-react";
import { api } from "@/lib/api";
import type { Section } from "@/lib/types";
import { Stagger } from "@/components/motion/Stagger";
import { CountUp } from "@/components/motion/CountUp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Layers;
  label: string;
  value: number;
}) {
  return (
    <Card className="py-0">
      <CardContent className="flex items-center gap-3 px-4 py-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4.5" />
        </span>
        <span className="min-w-0">
          <span className="block text-2xl leading-tight font-semibold tracking-tight">
            <CountUp value={value} />
          </span>
          <span className="block truncate text-xs text-muted-foreground">{label}</span>
        </span>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[4.75rem] rounded-xl" />
        ))}
      </div>
      <div className="grid gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[5.5rem] rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function Dashboard() {
  const [query, setQuery] = useState("");

  const { data, isPending, error } = useQuery({
    queryKey: ["sections"],
    queryFn: () => api.get<{ sections: Section[] }>("/sections"),
  });

  const sections = data?.sections;

  const stats = useMemo(() => {
    if (!sections) return null;
    return {
      classes: sections.length,
      learners: sections.reduce((n, s) => n + s.studentCount, 0),
      subjects: new Set(sections.map((s) => s.subject)).size,
    };
  }, [sections]);

  const visible = useMemo(() => {
    if (!sections) return [];
    const q = query.trim().toLowerCase();
    if (!q) return sections;
    return sections.filter((s) =>
      [s.name, s.subject, s.schoolYear, `grade ${s.gradeLevel}`].some((field) =>
        field.toLowerCase().includes(q),
      ),
    );
  }, [sections, query]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My classes</h1>
          <p className="text-sm text-muted-foreground">
            Your class lists for this school year.
          </p>
        </div>
        <Button className="transition-transform hover:-translate-y-px active:translate-y-0">
          <Plus />
          New class
        </Button>
      </div>

      <div className="mt-6">
        {error ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="text-sm text-destructive">{error.message}</CardContent>
          </Card>
        ) : isPending || !sections ? (
          <DashboardSkeleton />
        ) : sections.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <span className="grid size-11 place-items-center rounded-full bg-primary/10 text-primary">
                <GraduationCap className="size-5" />
              </span>
              <span>
                <span className="block font-medium">No classes yet</span>
                <span className="block text-sm text-muted-foreground">
                  Create one to start adding learners.
                </span>
              </span>
              <Button className="mt-1">
                <Plus />
                New class
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {stats && (
              <Stagger className="grid gap-3 sm:grid-cols-3" each={0.08}>
                <StatTile icon={Layers} label="Classes" value={stats.classes} />
                <StatTile icon={Users} label="Learners" value={stats.learners} />
                <StatTile icon={BookOpen} label="Subjects" value={stats.subjects} />
              </Stagger>
            )}

            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by class, subject or grade…"
                aria-label="Search classes"
                className="pl-9"
              />
            </div>

            {visible.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No classes match “{query}”.
              </p>
            ) : (
              <Stagger
                as="ul"
                className="grid gap-3"
                onScroll
                // Re-runs when the filter changes, so results animate in rather
                // than snapping — keyed on the ids, not the array identity.
                key={visible.map((s) => s.id).join()}
              >
                {visible.map((s) => (
                  <li key={s.id}>
                    <Link
                      to={`/sections/${s.id}`}
                      className="group flex items-center justify-between gap-4 rounded-xl border bg-card p-4 shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          Grade {s.gradeLevel} — {s.name}
                        </span>
                        <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <Badge variant="secondary">{s.subject}</Badge>
                          <Badge variant="outline" className="tabular">
                            S.Y. {s.schoolYear}
                          </Badge>
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground">
                        <Users className="size-4" />
                        <span className="tabular">{s.studentCount}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </Stagger>
            )}
          </div>
        )}
      </div>
    </>
  );
}
