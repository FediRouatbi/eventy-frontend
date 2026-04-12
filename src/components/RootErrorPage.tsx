import { Link, useRouterState } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, LifeBuoy, RefreshCcw } from "lucide-react";

import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent } from "#/components/ui/card";

export default function RootErrorPage({ error }: { error: unknown }) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const isAdminPath = pathname.startsWith("/admin");

  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Unexpected error";

  return (
    <main className="mx-auto grid min-h-[calc(100vh-11rem)] max-w-6xl gap-6 px-4 pb-12 pt-12 lg:grid-cols-[1.05fr_0.95fr] lg:pt-14">
      <Card className="border-none bg-transparent shadow-none">
        <CardContent className="space-y-6 px-0">
          <Badge variant="outline" className="w-fit rounded-full">
            Something went wrong
          </Badge>
          <div className="space-y-4">
            <h1 className="font-serif text-5xl font-semibold leading-tight text-foreground sm:text-6xl">
              We hit a snag{" "}
              <span className="text-muted-foreground">loading this page.</span>
            </h1>
            <p className="max-w-xl text-base leading-8 text-muted-foreground">
              Try going back, refreshing, or visiting a safe page. If this keeps
              happening, let us know what you were doing.
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
              type="button"
              size="lg"
              variant="outline"
              className="rounded-full bg-background/80"
              onClick={() => window.location.reload()}
            >
              <RefreshCcw className="size-4" />
              Refresh
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-full bg-background/80"
            >
              <Link to={isAdminPath ? "/login" : "/support"}>
                <LifeBuoy className="size-4" />
                Support
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[2rem] bg-card/95">
        <CardContent className="space-y-4 p-6 sm:p-7">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Error details
            </p>
            <p className="text-sm leading-7 text-muted-foreground">
              This is what the app reported while rendering the route.
            </p>
          </div>

          <div className="rounded-[1.35rem] border border-destructive/30 bg-destructive/5 px-5 py-4 text-sm text-destructive">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 size-4" />
              <div className="space-y-1">
                <p className="font-semibold">Error message</p>
                <p className="text-destructive/90">{message}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.35rem] border border-border/70 bg-muted/35 px-5 py-4 text-sm text-muted-foreground">
            Route: <span className="font-medium text-foreground">{pathname}</span>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

