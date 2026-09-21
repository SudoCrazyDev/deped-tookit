import { useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { Loader2, LogOut, Phone, RotateCcw, User, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { formatSubscriber } from "@/lib/phone";
import { DURATION, EASE, gsap, motionSafe, useGSAP } from "@/lib/motion";
import { Brand } from "./Brand";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

/** Two letters for the avatar, from the name if there is one, else the email. */
function initials(from: string) {
  const parts = from.split(/[\s.@_-]+/).filter(Boolean);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}

export function AppShell({ children }: { children: ReactNode }) {
  const { teacher, logout, resetOnboarding } = useAuth();
  const header = useRef<HTMLElement>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  useGSAP(
    () => {
      motionSafe(() => {
        gsap.from(header.current, {
          y: -56,
          autoAlpha: 0,
          duration: DURATION.base,
          ease: EASE.out,
        });
      });
    },
    { scope: header },
  );

  // Name is optional, so fall back to the address they signed up with.
  const label = teacher?.fullName ?? teacher?.email ?? "";

  async function onSignOut() {
    try {
      await logout();
      toast.success("Signed out");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not sign out");
    }
  }

  async function onResetOnboarding() {
    setResetting(true);
    try {
      await resetOnboarding();
      // No navigation here: clearing `onboardedAt` is enough, and RequireAuth
      // moves the teacher to the wizard on the next render.
      toast.success("Setup cleared", { description: "Let's go through it again." });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reset your setup");
    } finally {
      setResetting(false);
      setConfirmingReset(false);
    }
  }

  return (
    <div className="min-h-dvh">
      <header
        ref={header}
        className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur-md supports-[backdrop-filter]:bg-card/70"
      >
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            to="/"
            className="rounded-md outline-none transition-transform hover:-translate-y-px focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <Brand />
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-9 gap-2 px-2 has-[>svg]:px-2"
                aria-label="Account menu"
              >
                <Avatar className="size-7">
                  <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary uppercase">
                    {initials(label)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden max-w-[16rem] truncate text-sm font-normal text-muted-foreground sm:inline">
                  {label}
                </span>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="font-normal">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <User className="size-3.5 text-muted-foreground" />
                  <span className="truncate">{label}</span>
                </span>
                {teacher?.contactNumber && (
                  <span className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone className="size-3.5" />
                    <span className="tabular">
                      +63 {formatSubscriber(teacher.contactNumber.replace(/^\+63/, ""))}
                    </span>
                  </span>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuItem asChild>
                <Link to="/profile">
                  <UserRound className="size-4" />
                  Profile
                </Link>
              </DropdownMenuItem>

              {/* The dialog is driven by state rather than wrapped around this
                  item: a trigger inside a menu is unmounted the moment the menu
                  closes, which takes the dialog with it. */}
              <DropdownMenuItem onSelect={() => setConfirmingReset(true)}>
                <RotateCcw className="size-4" />
                Reset onboarding
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => void onSignOut()}>
                <LogOut className="size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <AlertDialog open={confirmingReset} onOpenChange={setConfirmingReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset your setup?</AlertDialogTitle>
            <AlertDialogDescription>
              This clears your region, division, school, school year, school head,
              role and grade level, and takes you back through setup. Your classes
              and learners are not touched.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={resetting}
              // Kept as a plain click: the default AlertDialogAction closes the
              // dialog on select, which would hide the pending state and the
              // error if the request fails.
              onClick={(e) => {
                e.preventDefault();
                void onResetOnboarding();
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {resetting && <Loader2 className="animate-spin" />}
              {resetting ? "Clearing…" : "Reset onboarding"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <main className="mx-auto max-w-5xl px-4 pt-8 pb-20 sm:px-6">{children}</main>
    </div>
  );
}
