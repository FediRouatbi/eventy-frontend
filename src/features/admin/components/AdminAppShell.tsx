import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  Building2,
  CalendarRange,
  Command,
  KeyRound,
  LayoutDashboard,
  LogOut,
  MoveRight,
  ScanLine,
  ShieldCheck,
  Tag,
} from "lucide-react";

import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import ThemeToggle from "#/components/ThemeToggle";
import { Card, CardContent } from "#/components/ui/card";
import { Separator } from "#/components/ui/separator";
import { isSuperAdminSession } from "#/features/admin/auth";
import { clearAuthSession, type AuthSession } from "#/lib/auth";
import { logout } from "#/lib/api/auth";
import { cn } from "#/lib/utils";

type NavItem = {
  to:
    | "/admin"
    | "/admin/events"
    | "/admin/check-in"
    | "/admin/categories"
    | "/admin/organizers";
  label: string;
  icon: ReactNode;
  superAdminOnly?: boolean;
};

const navItems: NavItem[] = [
  {
    to: "/admin",
    label: "Dashboard",
    icon: <LayoutDashboard className="size-4" />,
  },
  {
    to: "/admin/events",
    label: "Events",
    icon: <CalendarRange className="size-4" />,
  },
  {
    to: "/admin/check-in",
    label: "Check-in",
    icon: <ScanLine className="size-4" />,
  },
  {
    to: "/admin/categories",
    label: "Categories",
    icon: <Tag className="size-4" />,
    superAdminOnly: true,
  },
  {
    to: "/admin/organizers",
    label: "Organizers",
    icon: <Building2 className="size-4" />,
    superAdminOnly: true,
  },
];

function matchesPath(currentPath: string, targetPath: string) {
  return currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);
}

function getSectionLabel(pathname: string, isSuperAdmin: boolean) {
  if (matchesPath(pathname, "/admin/events")) {
    return "Events";
  }

  if (matchesPath(pathname, "/admin/check-in")) {
    return "Check-in";
  }

  if (isSuperAdmin && matchesPath(pathname, "/admin/categories")) {
    return "Categories";
  }

  if (isSuperAdmin && matchesPath(pathname, "/admin/organizers")) {
    return "Organizers";
  }

  return "Dashboard";
}

function getSectionMeta(pathname: string, isSuperAdmin: boolean) {
  if (matchesPath(pathname, "/admin/events")) {
    return {
      kicker: "Operations",
      description: "Find events faster and jump directly into setup work.",
      actionLabel: "Open Dashboard",
      actionTo: "/admin" as const,
    };
  }

  if (matchesPath(pathname, "/admin/check-in")) {
    return {
      kicker: "Door",
      description: "Scan ticket QR codes and validate entry in seconds.",
      actionLabel: "Open Events",
      actionTo: "/admin/events" as const,
    };
  }

  if (isSuperAdmin && matchesPath(pathname, "/admin/categories")) {
    return {
      kicker: "Discovery",
      description: "Keep the discovery structure clean and easy to maintain.",
      actionLabel: "Open Events",
      actionTo: "/admin/events" as const,
    };
  }

  if (isSuperAdmin && matchesPath(pathname, "/admin/organizers")) {
    return {
      kicker: "Ownership",
      description: "Review workspace ownership and drill into organizer activity.",
      actionLabel: "Open Events",
      actionTo: "/admin/events" as const,
    };
  }

  return {
    kicker: "Overview",
    description: "Track platform state and move directly to the next action.",
    actionLabel: "Open Events",
    actionTo: "/admin/events" as const,
  };
}

export function AdminAppShell({ session }: { session: AuthSession }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isSuperAdmin = isSuperAdminSession(session);
  const sectionLabel = getSectionLabel(location.pathname, isSuperAdmin);
  const sectionMeta = getSectionMeta(location.pathname, isSuperAdmin);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const visibleItems = navItems.filter((item) =>
    item.superAdminOnly ? isSuperAdmin : true,
  );

  return (
    <main className="h-[100svh] overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(231,138,72,0.12),transparent_24%),linear-gradient(180deg,rgba(255,248,240,0.98),rgba(255,255,255,0.94))] dark:bg-[radial-gradient(circle_at_top_right,rgba(231,138,72,0.10),transparent_24%),linear-gradient(180deg,rgba(45,42,38,0.98),rgba(33,31,28,0.96))]">
      <div className="grid h-full lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="h-[100svh] overflow-hidden border-b border-border/70 bg-card/88 backdrop-blur-xl lg:border-b-0 lg:border-r lg:bg-card/82">
          <div className="flex h-full flex-col px-4 py-4">
            <div className="rounded-2xl border border-border/70 bg-background/88 p-3 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex size-11 items-center justify-center rounded-xl bg-primary/12 text-primary">
                  <Command className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    Eventy Admin
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isSuperAdmin
                      ? 'Super Admin Workspace'
                      : 'Organizer Workspace'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex-1 space-y-4 overflow-y-auto pr-1">
              <div className="space-y-2">
                <p className="px-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Navigation
                </p>
                <div className="space-y-1">
                  {visibleItems.map((item) => (
                    <Button
                      key={item.to}
                      asChild
                      variant="ghost"
                      className={cn(
                        'h-11 w-full justify-start rounded-xl px-3',
                        matchesPath(location.pathname, item.to)
                          ? 'bg-background text-foreground shadow-sm hover:bg-background/90 dark:bg-background/70 dark:hover:bg-background/80'
                          : 'text-muted-foreground hover:bg-background/65 hover:text-foreground dark:hover:bg-background/45',
                      )}
                    >
                      <Link to={item.to}>
                        {item.icon}
                        {item.label}
                      </Link>
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-border/70 bg-background/88 p-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-primary/14 text-sm font-semibold text-primary">
                  {session.user.name
                    .split(' ')
                    .map((part) => part[0] ?? '')
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {session.user.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {session.user.email}
                  </p>
                </div>
              </div>

              <Separator className="my-3" />

              <Button
                asChild
                variant="outline"
                className="w-full justify-start rounded-xl mb-2"
              >
                <Link to="/admin/reset-password">
                  <KeyRound className="size-4" />
                  Change password
                </Link>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start rounded-xl"
                disabled={isSigningOut}
                onClick={async () => {
                  setIsSigningOut(true);
                  try {
                    await logout(session.refresh_token);
                  } catch {}
                  clearAuthSession();
                  navigate({ to: '/login' });
                  setIsSigningOut(false);
                }}
              >
                <LogOut className="size-4" />
                {isSigningOut ? 'Signing out' : 'Logout'}
              </Button>
            </div>
          </div>
        </aside>

        <section className="min-w-0 overflow-y-auto">
          <div className="sticky top-0 z-30 border-b border-border/70 bg-background/82 backdrop-blur-xl">
            <div className="px-5 py-4 lg:px-8">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <Badge variant="outline" className="rounded-full">
                    <ShieldCheck className="mr-1.5 size-3.5" />
                    {isSuperAdmin ? 'Super admin' : 'Organizer admin'}
                  </Badge>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {sectionMeta.kicker}
                    </p>
                    <p className="text-lg font-semibold text-foreground">
                      {sectionLabel}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {sectionMeta.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button asChild variant="outline" className="rounded-full">
                    <Link to={sectionMeta.actionTo}>
                      {sectionMeta.actionLabel}
                      <MoveRight className="size-4" />
                    </Link>
                  </Button>
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </div>

          <div className="px-5 py-6 lg:px-8 lg:py-8 space-y-6 lg:space-y-8">
            <Outlet />
          </div>
        </section>
      </div>
    </main>
  );
}
