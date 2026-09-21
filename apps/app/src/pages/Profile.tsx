import type { ReactNode } from "react";
import {
  BookMarked,
  GraduationCap,
  Landmark,
  Mail,
  Phone,
  RotateCcw,
  User,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Advisory } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { formatSubscriber } from "@/lib/phone";
import { gradeLevelLabel, regionLabel, teacherRoleLabel } from "@/lib/deped";
import { Stagger } from "@/components/motion/Stagger";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * One label-and-value pair.
 *
 * A missing value is shown as an em dash rather than an empty cell: every
 * field here is answered during onboarding, so a blank one means something
 * went wrong and should look like an absence, not like the end of the list.
 */
function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-medium">
        {value || <span className="text-muted-foreground">—</span>}
      </dd>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof User;
  title: string;
  children: ReactNode;
}) {
  return (
    <Card className="py-0">
      <CardContent className="px-5 py-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <span className="grid size-7 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
            <Icon className="size-3.5" />
          </span>
          {title}
        </h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">{children}</dl>
      </CardContent>
    </Card>
  );
}

/**
 * A read-only view of everything the teacher told us: the sign-up details and
 * the answers from the onboarding wizard.
 *
 * Nothing is editable here yet. The one way to change the school details is
 * Reset onboarding in the account menu, which walks the wizard again — so
 * this page says that rather than leaving a teacher hunting for an edit
 * button that does not exist.
 */
export function Profile() {
  const { teacher } = useAuth();
  const adviser = teacher?.role === "class_adviser";

  // Advisories are a list, so they are not carried on the teacher object that
  // every authenticated request already loads — this is the one screen that
  // wants them. Only a class adviser has any.
  const { data, isPending } = useQuery({
    queryKey: ["advisories"],
    queryFn: () => api.get<{ advisories: Advisory[] }>("/onboarding/advisories"),
    enabled: adviser,
  });

  if (!teacher) return null;

  const contact = teacher.contactNumber
    ? `+63 ${formatSubscriber(teacher.contactNumber.replace(/^\+63/, ""))}`
    : null;

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Your account and the school details your forms are printed with.
        </p>
      </div>

      <Stagger className="mt-6 grid gap-3" each={0.08}>
        <Section icon={User} title="Account">
          <Field
            label="Email"
            value={
              <span className="flex items-center gap-1.5">
                <Mail className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{teacher.email}</span>
              </span>
            }
          />
          <Field
            label="Contact number"
            value={
              contact && (
                <span className="flex items-center gap-1.5">
                  <Phone className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="tabular">{contact}</span>
                </span>
              )
            }
          />
          <Field label="Full name" value={teacher.fullName} />
        </Section>

        <Section icon={Landmark} title="School">
          <Field
            label="Region"
            value={teacher.region && regionLabel(teacher.region)}
          />
          <Field label="Division" value={teacher.division} />
          <Field
            label="School ID"
            value={teacher.schoolId && <span className="tabular">{teacher.schoolId}</span>}
          />
          <Field label="School name" value={teacher.school} />
          <Field
            label="School year"
            value={
              teacher.schoolYear && (
                <span className="tabular">S.Y. {teacher.schoolYear}</span>
              )
            }
          />
          <Field label="School head" value={teacher.schoolHead} />
        </Section>

        <Section icon={GraduationCap} title="Teaching">
          <Field
            label="Role"
            value={
              teacher.role && (
                <Badge variant="secondary" className="gap-1.5 font-medium">
                  <BookMarked className="size-3" />
                  {teacherRoleLabel(teacher.role)}
                </Badge>
              )
            }
          />
          {adviser ? (
            <div className="min-w-0 sm:col-span-2">
              <dt className="text-xs text-muted-foreground">
                Advisory {data && data.advisories.length === 1 ? "class" : "classes"}
              </dt>
              <dd className="mt-1.5 flex flex-wrap gap-1.5">
                {isPending ? (
                  <Skeleton className="h-5.5 w-32 rounded-md" />
                ) : data?.advisories.length ? (
                  data.advisories.map((a) => (
                    <Badge
                      key={`${a.gradeLevel}/${a.sectionName}`}
                      variant="outline"
                      className="font-medium"
                    >
                      {gradeLevelLabel(a.gradeLevel)} &middot; {a.sectionName}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </dd>
            </div>
          ) : (
            <Field
              label="Grade level"
              value={
                teacher.gradeLevel && (
                  <Badge variant="outline">{gradeLevelLabel(teacher.gradeLevel)}</Badge>
                )
              }
            />
          )}
        </Section>

        <p className="flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
          <RotateCcw className="mt-px size-3.5 shrink-0" />
          <span>
            To change your school details, use <strong>Reset onboarding</strong> in
            the account menu and answer the setup questions again.
          </span>
        </p>
      </Stagger>
    </>
  );
}
