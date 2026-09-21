import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import {
  ArrowRight,
  CalendarDays,
  GraduationCap,
  Landmark,
  Route,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Assignment, Section } from "@/lib/types";
import { gradeLevelLabel } from "@/lib/deped";
import { Stagger } from "@/components/motion/Stagger";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * The integer behind a grade code, or null for Kinder, which has none.
 *
 * `Assignment.gradeLevel` is a code ("g5") because Kinder has to be sayable;
 * `Section.gradeLevel` is the number the weight profile is chosen against.
 * Matching the two is the only reason this exists.
 */
function gradeNumber(code: string): number | null {
  const n = Number(code.replace(/^g/, ""));
  return code.startsWith("g") && Number.isFinite(n) ? n : null;
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

function AdvisorySkeleton() {
  return (
    <div className="mt-6 space-y-3">
      <Skeleton className="h-36 rounded-xl" />
      <Skeleton className="h-24 rounded-xl" />
    </div>
  );
}

function PageHeading() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">My Advisory</h1>
      <p className="text-sm text-muted-foreground">The class you are the adviser of.</p>
    </div>
  );
}

/**
 * The one class a teacher is answerable for.
 *
 * An advisory is not just another row in the class list: it is the section
 * whose forms carry this teacher's name, so it gets a screen of its own rather
 * than being hunted for on the dashboard.
 *
 * What onboarding records is a grade level and a section name, not a class
 * record — so this page answers both questions: what the advisory is, and
 * whether there is a class list behind it yet to open.
 */
export function Advisory() {
  const { teacher } = useAuth();
  const adviser = teacher?.role === "class_adviser";

  const { data, isPending } = useQuery({
    queryKey: ["assignments"],
    queryFn: () => api.get<{ assignments: Assignment[] }>("/onboarding/assignments"),
    enabled: Boolean(teacher?.onboardedAt) && adviser,
  });

  // Shares the dashboard's cache entry, so arriving from there costs nothing.
  const { data: sectionData } = useQuery({
    queryKey: ["sections"],
    queryFn: () => api.get<{ sections: Section[] }>("/sections"),
    enabled: adviser,
  });

  if (!teacher) return null;

  // A floating teacher has no advisory — that is what the role means, not a
  // gap in their setup — so this says so plainly rather than showing an empty
  // state that reads like something went missing.
  if (!adviser) {
    return (
      <>
        <PageHeading />

        <Card className="mt-6 border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="grid size-11 place-items-center rounded-full bg-primary/10 text-primary">
              <Route className="size-5" />
            </span>
            <span>
              <span className="block font-medium">You have no advisory class</span>
              <span className="mt-1 block max-w-sm text-sm text-muted-foreground">
                You are set up as a floating teacher, so your classes are the
                sections you teach in. They are all on the dashboard.
              </span>
            </span>
            <Button asChild variant="outline" className="mt-1">
              <Link to="/">
                Go to my classes
                <ArrowRight />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </>
    );
  }

  const advisory = data?.assignments[0];
  const grade = advisory ? gradeNumber(advisory.gradeLevel) : null;

  // The class record kept for the advisory, if the teacher has made one yet.
  // Matched on grade and name because that pair is what identifies a section
  // to a teacher; having none is the normal state right after onboarding.
  const section = advisory
    ? sectionData?.sections.find(
        (s) => s.gradeLevel === grade && same(s.name, advisory.sectionName),
      )
    : undefined;

  return (
    <>
      <PageHeading />

      {isPending ? (
        <AdvisorySkeleton />
      ) : !advisory ? (
        <Card className="mt-6 border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="grid size-11 place-items-center rounded-full bg-primary/10 text-primary">
              <GraduationCap className="size-5" />
            </span>
            <span>
              <span className="block font-medium">No advisory on record</span>
              <span className="mt-1 block max-w-sm text-sm text-muted-foreground">
                Your setup does not name one. Use <strong>Reset onboarding</strong> in
                the account menu to answer the setup questions again.
              </span>
            </span>
          </CardContent>
        </Card>
      ) : (
        <Stagger className="mt-6 grid gap-3" each={0.08}>
          <Card className="py-0">
            <CardContent className="px-5 py-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <GraduationCap className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold tracking-tight">
                      {gradeLevelLabel(advisory.gradeLevel)} &mdash;{" "}
                      {advisory.sectionName}
                    </h2>
                    <p className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge variant="secondary" className="font-medium">
                        Advisory class
                      </Badge>
                      {section && (
                        <Badge variant="outline" className="gap-1.5">
                          <Users className="size-3" />
                          <span className="tabular">{section.studentCount} learners</span>
                        </Badge>
                      )}
                    </p>
                  </div>
                </div>

                {section && (
                  <Button
                    asChild
                    className="transition-transform hover:-translate-y-px active:translate-y-0"
                  >
                    <Link to={`/sections/${section.id}`}>
                      Open class list
                      <ArrowRight />
                    </Link>
                  </Button>
                )}
              </div>

              <dl className="mt-5 grid gap-4 border-t pt-4 sm:grid-cols-3">
                <div className="min-w-0">
                  <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Landmark className="size-3.5" />
                    School
                  </dt>
                  <dd className="mt-0.5 truncate text-sm font-medium">
                    {teacher.school || <span className="text-muted-foreground">—</span>}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays className="size-3.5" />
                    School year
                  </dt>
                  <dd className="mt-0.5 truncate text-sm font-medium tabular">
                    {teacher.schoolYear ? (
                      `S.Y. ${teacher.schoolYear}`
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="size-3.5" />
                    Adviser
                  </dt>
                  <dd className="mt-0.5 truncate text-sm font-medium">
                    {teacher.fullName || teacher.email}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {!section && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                <span className="grid size-11 place-items-center rounded-full bg-primary/10 text-primary">
                  <Users className="size-5" />
                </span>
                <span>
                  <span className="block font-medium">No class list yet</span>
                  <span className="mt-1 block max-w-sm text-sm text-muted-foreground">
                    Create a class for {gradeLevelLabel(advisory.gradeLevel)} &mdash;{" "}
                    {advisory.sectionName} to start adding learners and recording
                    grades.
                  </span>
                </span>
                <Button asChild variant="outline" className="mt-1">
                  <Link to="/">
                    Go to my classes
                    <ArrowRight />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </Stagger>
      )}
    </>
  );
}
