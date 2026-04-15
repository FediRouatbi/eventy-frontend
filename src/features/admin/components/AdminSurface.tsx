import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#/components/ui/card";
import { cn } from "#/lib/utils";

export function AdminPageHeader({
  badge,
  title,
  description,
  actions,
  className,
}: {
  badge: string;
  title: string;
  description: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("app-surface rounded-[2rem] border-border/60", className)}>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <Badge variant="outline" className="w-fit rounded-full">
            {badge}
          </Badge>
          <div className="space-y-2">
            <CardTitle className="font-serif text-4xl">{title}</CardTitle>
            <CardDescription className="max-w-3xl text-base leading-8">
              {description}
            </CardDescription>
          </div>
        </div>
        {actions ? <div className="w-full sm:w-auto">{actions}</div> : null}
      </CardHeader>
    </Card>
  );
}

export function AdminKpiStrip({
  items,
}: {
  items: Array<{ label: string; value: ReactNode }>;
}) {
  const gridClass =
    items.length >= 4
      ? "xl:grid-cols-4"
      : items.length === 3
        ? "md:grid-cols-3"
        : items.length === 2
          ? "md:grid-cols-2"
          : "md:grid-cols-1";

  return (
    <div className={cn("grid gap-4", gridClass)}>
      {items.map((item) => (
        <Card
          key={item.label}
          className="rounded-[1.5rem] border-border/70 bg-card/92 shadow-none"
        >
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {item.label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {item.value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function AdminSectionCard({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("app-surface rounded-[1.75rem] border-border/60", className)}>
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
          {actions ? <div className="flex flex-col gap-3 sm:flex-row">{actions}</div> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

export function AdminEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Card className="rounded-[1.5rem] border-dashed border-border/70 bg-background/65 shadow-none">
      <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
        <div className="space-y-1">
          <p className="font-medium text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {action}
      </CardContent>
    </Card>
  );
}

export function AdminLoadingGrid({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, index) => (
        <Card
          key={index}
          className="rounded-[1.5rem] border-border/70 bg-background/70 shadow-none"
        >
          <CardContent className="animate-pulse space-y-3 p-5">
            <div className="h-5 w-48 rounded-full bg-muted" />
            <div className="h-4 w-32 rounded-full bg-muted/80" />
            <div className="h-4 w-full rounded-full bg-muted/70" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function AdminDangerZone({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Card className="rounded-[1.75rem] border-destructive/25 bg-destructive/8 shadow-none">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {action ? <CardContent>{action}</CardContent> : null}
    </Card>
  );
}

export function AdminStickySectionNav({
  items,
}: {
  items: Array<{ id: string; label: string; active?: boolean; search?: Record<string, string | undefined> }>;
}) {
  return (
    <div className="sticky top-0 z-20 rounded-[1.25rem] border border-border/70 bg-background/92 p-2 shadow-xs backdrop-blur-md">
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Button
            key={item.id}
            asChild
            variant={item.active ? "default" : "ghost"}
            className="rounded-full"
          >
            <Link
              to="."
              search={(prev: Record<string, unknown>) => ({
                ...prev,
                ...item.search,
              })}
            >
              {item.label}
            </Link>
          </Button>
        ))}
      </div>
    </div>
  );
}
