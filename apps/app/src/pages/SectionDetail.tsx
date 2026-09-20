import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { ArrowLeft, UserPlus, Users } from "lucide-react";
import { api } from "@/lib/api";
import type { Section, Student } from "@/lib/types";
import { DURATION, EASE, gsap, motionSafe, useGSAP } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function fullName(s: Student) {
  return [`${s.lastName},`, s.firstName, s.middleName].filter(Boolean).join(" ");
}

function ClassListSkeleton() {
  return (
    <div className="mt-6 space-y-3">
      <Skeleton className="h-10 rounded-lg" />
      {[0, 1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-11 rounded-lg" />
      ))}
    </div>
  );
}

export function SectionDetail() {
  const { sectionId } = useParams<{ sectionId: string }>();
  const tableScope = useRef<HTMLDivElement>(null);

  const { data, isPending, error } = useQuery({
    queryKey: ["section", sectionId],
    queryFn: () =>
      api.get<{ section: Section; students: Student[] }>(`/sections/${sectionId}`),
    enabled: Boolean(sectionId),
  });

  const students = data?.students;

  useGSAP(
    () => {
      if (!students?.length) return;

      motionSafe(() => {
        gsap.from(gsap.utils.toArray<HTMLElement>("tbody tr", tableScope.current), {
          autoAlpha: 0,
          y: 10,
          duration: DURATION.fast,
          ease: EASE.out,
          // A class list can run to 60 learners; cap the total so the last row
          // is not still arriving seconds after the first.
          stagger: { each: 0.03, amount: 0.6 },
        });
      });
    },
    { dependencies: [students], revertOnUpdate: true, scope: tableScope },
  );

  if (isPending) return <ClassListSkeleton />;

  if (error) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="text-sm text-destructive">{error.message}</CardContent>
      </Card>
    );
  }

  const { section } = data;

  return (
    <>
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <ArrowLeft className="size-4" />
        All classes
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Grade {section.gradeLevel} — {section.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary">{section.subject}</Badge>
            <Badge variant="outline" className="tabular">
              S.Y. {section.schoolYear}
            </Badge>
            <Badge variant="outline">
              <Users className="size-3" />
              <span className="tabular">{data.students.length}</span> learners
            </Badge>
          </div>
        </div>
        <Button
          variant="outline"
          className="transition-transform hover:-translate-y-px active:translate-y-0"
        >
          <UserPlus />
          Add learner
        </Button>
      </div>

      {data.students.length === 0 ? (
        <Card className="mt-6 border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="grid size-11 place-items-center rounded-full bg-primary/10 text-primary">
              <Users className="size-5" />
            </span>
            <span>
              <span className="block font-medium">No learners in this class yet</span>
              <span className="block text-sm text-muted-foreground">
                Add them one by one, or import your class list.
              </span>
            </span>
            <Button variant="outline" className="mt-1">
              <UserPlus />
              Add learner
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div ref={tableScope} className="mt-6 overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12 text-right">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>LRN</TableHead>
                <TableHead className="w-16">Sex</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.students.map((s, i) => (
                <TableRow key={s.id}>
                  <TableCell className="text-right text-muted-foreground tabular">
                    {i + 1}
                  </TableCell>
                  <TableCell className="font-medium">{fullName(s)}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground tabular">
                    {s.lrn ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{s.sex}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
