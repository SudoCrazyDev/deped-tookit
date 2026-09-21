import { useRef, useState } from "react";
import { Link, NavLink, type LinkProps } from "react-router";
import { LayoutDashboard, Menu, Users } from "lucide-react";
import { DURATION, EASE, gsap, motionSafe, useGSAP } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { Brand } from "./Brand";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type NavItem = {
  to: LinkProps["to"];
  label: string;
  icon: typeof LayoutDashboard;
  /** Match the path exactly. Needed for "/", which otherwise matches everything. */
  end?: boolean;
};

/**
 * The app's primary navigation.
 *
 * Deliberately short: a teacher's two jobs here are looking at everything they
 * handle and looking after the one class that is theirs. Anything deeper —
 * a class list, an assessment — is reached from those two screens, not from
 * here, so this list does not grow a level of nesting.
 */
const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/advisory", label: "My Advisory", icon: Users },
];

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex-1 px-3 py-4" aria-label="Main">
      <ul className="grid gap-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <li key={label}>
            <NavLink
              to={to}
              end={end}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={cn(
                      "size-4.5 shrink-0 transition-transform group-hover:scale-110",
                      isActive && "text-sidebar-primary",
                    )}
                  />
                  <span className="truncate">{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * The fixed rail, from the large breakpoint up.
 *
 * `sticky` rather than `fixed`: it lives in the shell's grid column, so the
 * main content is laid out beside it without a matching margin to keep in
 * sync, and it still stays put as the page scrolls.
 */
export function Sidebar() {
  const aside = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      motionSafe(() => {
        gsap.from(aside.current, {
          x: -24,
          autoAlpha: 0,
          duration: DURATION.base,
          ease: EASE.out,
        });
      });
    },
    { scope: aside },
  );

  return (
    <aside
      ref={aside}
      className="sticky top-0 hidden h-dvh flex-col border-r bg-sidebar lg:flex"
    >
      <div className="flex h-14 shrink-0 items-center border-b px-5">
        <Link
          to="/"
          className="rounded-md outline-none transition-transform hover:-translate-y-px focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <Brand />
        </Link>
      </div>
      <SidebarNav />
    </aside>
  );
}

/**
 * The same navigation as a drawer, for screens too narrow for the rail.
 *
 * Open state is owned here rather than by the shell: nothing outside this
 * component opens it, and keeping it local means the shell does not re-render
 * the whole page when the drawer is toggled.
 */
export function SidebarDrawer() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>

      <SheetContent side="left" className="p-0">
        <div className="flex h-14 shrink-0 items-center border-b px-5">
          <Link to="/" onClick={() => setOpen(false)} className="rounded-md outline-none">
            <Brand />
          </Link>
        </div>
        {/* Radix wants both for the dialog to be announced; the rail's own
            heading is visual, so these stay for screen readers only. */}
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <SheetDescription className="sr-only">
          Move between the dashboard and your advisory class.
        </SheetDescription>
        <SidebarNav onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
