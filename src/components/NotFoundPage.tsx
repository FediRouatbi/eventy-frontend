import { Link, useRouterState } from "@tanstack/react-router";
import {
  ArrowLeft,
  CalendarRange,
  LayoutDashboard,
  LifeBuoy,
  Search,
} from "lucide-react";

import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent } from "#/components/ui/card";

export default function NotFoundPage() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const isAdminPath = pathname.startsWith("/admin");

  return (
    <main className="mx-auto grid min-h-[calc(100vh-11rem)] max-w-6xl gap-6 px-4 pb-12 pt-12 lg:grid-cols-[1.05fr_0.95fr] lg:pt-14">
      <Card className="border-none bg-transparent shadow-none">
        <CardContent className="space-y-6 px-0">
          <Badge variant="outline" className="w-fit rounded-full">
            404 - Not found
          </Badge>
          <div className="space-y-4">
            <h1 className="font-serif text-5xl font-semibold leading-tight text-foreground sm:text-6xl">
              This page{" "}
              <span className="text-muted-foreground">
                isn't on the guest list.
              </span>
            </h1>
            <p className="max-w-xl text-base leading-8 text-muted-foreground">
              The link may be wrong, expired, or the page was moved. Pick one of
              the shortcuts to get back on track.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="rounded-full">
              <Link to={isAdminPath ? "/admin" : "/"}>
                <ArrowLeft className="size-4" />
                Go back
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-full bg-background/80"
            >
              <Link to={isAdminPath ? "/login" : "/events"}>
                <Search className="size-4" />
                {isAdminPath ? "Admin login" : "Browse events"}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[2rem] bg-card/95">
        <CardContent className="space-y-4 p-6 sm:p-7">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Quick links
            </p>
            <p className="text-sm leading-7 text-muted-foreground">
              Use these to jump to the most common destinations.
            </p>
          </div>

          <div className="grid gap-3">
            <Button
              asChild
              variant="outline"
              className="h-auto justify-between rounded-[1.35rem] bg-background px-5 py-4"
            >
              <Link to={isAdminPath ? "/admin" : "/events"}>
                <span className="inline-flex items-center gap-3">
                  {isAdminPath ? (
                    <LayoutDashboard className="size-5 text-primary" />
                  ) : (
                    <CalendarRange className="size-5 text-primary" />
                  )}
                  <span className="text-left">
                    <span className="block font-semibold text-foreground">
                      {isAdminPath ? "Dashboard" : "Event directory"}
                    </span>
                    <span className="block text-sm text-muted-foreground">
                      {isAdminPath
                        ? "Return to organizer tools."
                        : "See what’s live right now."}
                    </span>
                  </span>
                </span>
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="h-auto justify-between rounded-[1.35rem] bg-background px-5 py-4"
            >
              <Link to={isAdminPath ? "/login" : "/support"}>
                <span className="inline-flex items-center gap-3">
                  <LifeBuoy className="size-5 text-primary" />
                  <span className="text-left">
                    <span className="block font-semibold text-foreground">
                      {isAdminPath ? "Sign in" : "Support"}
                    </span>
                    <span className="block text-sm text-muted-foreground">
                      {isAdminPath
                        ? "Authenticate to continue."
                        : "Get help if something looks off."}
                    </span>
                  </span>
                </span>
              </Link>
            </Button>
          </div>

          <div className="rounded-[1.35rem] border border-border/70 bg-muted/35 px-5 py-4 text-sm text-muted-foreground">
            Looking for <span className="font-medium text-foreground">{pathname}</span>
            ? Double-check the spelling or use the buttons above.
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
