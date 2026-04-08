import { Link, createFileRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Building2,
  CalendarRange,
  MapPin,
  ShieldCheck,
  Tag,
  Ticket,
} from 'lucide-react';

import { Badge } from '#/components/ui/badge';
import { Button } from '#/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card';
import { AdminLoadingGrid } from '#/features/admin/components/AdminSurface';
import { isSuperAdminSession } from '#/features/admin/auth';
import { getAdminOverview } from '#/lib/api/admin';
import { useAuthSession } from '#/lib/auth';

export const Route = createFileRoute('/admin/')({
  component: AdminOverviewPage,
});

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatCount(value: number, singular: string, plural = `${singular}s`) {
  return `${value} ${value === 1 ? singular : plural}`;
}

function StatCard({
  caption,
  helper,
  icon,
  value,
}: {
  caption: string;
  helper: string;
  icon: ReactNode;
  value: string;
}) {
  return (
    <Card className="rounded-[1.5rem] border-border/70 bg-card/92 shadow-none">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">{caption}</p>
            <p className="text-3xl font-semibold tracking-tight text-foreground">
              {value}
            </p>
            <p className="text-sm text-muted-foreground">{helper}</p>
          </div>
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardContent className="p-4 text-sm text-destructive">
        {message}
      </CardContent>
    </Card>
  );
}

function AdminOverviewPage() {
  const session = useAuthSession();
  const isSuperAdmin = isSuperAdminSession(session);
  const {
    data: overview,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['admin-overview', session?.access_token],
    enabled: Boolean(session?.access_token),
    queryFn: () => getAdminOverview(session!.access_token),
  });
  const loadError =
    error instanceof Error
      ? error.message
      : error
        ? 'Failed to load overview'
        : '';

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Badge variant="outline" className="rounded-full">
          Dashboard
        </Badge>
        <div className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
            {isSuperAdmin
              ? 'A platform-level workspace with the key organizer, event, session, and ticket signals in one place.'
              : 'A focused organizer workspace for events, sessions, and ticket operations.'}
          </p>
        </div>
      </div>

      {loadError ? <InlineError message={loadError} /> : null}

      {isLoading ? <AdminLoadingGrid rows={3} /> : null}

      {!isLoading && overview ? (
        <>
          <div className="grid gap-4 xl:grid-cols-4">
            <StatCard
              caption={isSuperAdmin ? 'Organizers' : 'Events'}
              helper={
                isSuperAdmin
                  ? 'Organizer workspaces on the platform'
                  : `${overview.stats.published_events} published events`
              }
              icon={<ShieldCheck className="size-4" />}
              value={String(
                isSuperAdmin
                  ? overview.stats.organizers
                  : overview.stats.events,
              )}
            />
            <StatCard
              caption={isSuperAdmin ? 'Categories' : 'Sessions'}
              helper={
                isSuperAdmin
                  ? 'Discovery categories available'
                  : `${overview.stats.scheduled_sessions} scheduled right now`
              }
              icon={<CalendarRange className="size-4" />}
              value={String(
                isSuperAdmin
                  ? overview.stats.categories
                  : overview.stats.sessions,
              )}
            />
            <StatCard
              caption="Ticket Types"
              helper="Configured sale options"
              icon={<Ticket className="size-4" />}
              value={String(overview.stats.ticket_types)}
            />
            <StatCard
              caption={isSuperAdmin ? 'Events' : 'Drafts'}
              helper={
                isSuperAdmin
                  ? `${overview.stats.published_events} published events`
                  : 'Events still in preparation'
              }
              icon={<MapPin className="size-4" />}
              value={String(
                isSuperAdmin
                  ? overview.stats.events
                  : overview.stats.draft_events,
              )}
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
            <Card className="rounded-[1.75rem] border-border/70 bg-card/94 shadow-none">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-3xl">Needs attention</CardTitle>
                    <CardDescription className="text-base">
                      The quickest way to spot incomplete setup work.
                    </CardDescription>
                  </div>
                  <Button asChild variant="outline" className="rounded-full">
                    <Link to="/admin/events">
                      Open events
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">
                        Draft events
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Events that are not published yet.
                      </p>
                    </div>
                    <p className="text-2xl font-semibold text-foreground">
                      {overview.needs_attention.draft_events_count}
                    </p>
                  </div>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">
                        Events without sessions
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Event records still missing bookable schedule entries.
                      </p>
                    </div>
                    <p className="text-2xl font-semibold text-foreground">
                      {overview.needs_attention.events_without_sessions_count}
                    </p>
                  </div>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">
                        Sessions without ticket setup
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Sessions that still need sellable ticket types.
                      </p>
                    </div>
                    <p className="text-2xl font-semibold text-foreground">
                      {
                        overview.needs_attention
                          .sessions_without_ticket_types_count
                      }
                    </p>
                  </div>
                </div>
                {overview.needs_attention.events_without_sessions.map(
                  (event) => (
                    <Link
                      key={event.id}
                      to="/admin/events/$eventId"
                      params={{ eventId: event.id }}
                      search={{ section: 'sessions' }}
                      className="block rounded-2xl border border-dashed border-border/70 bg-background/55 px-4 py-3 text-sm no-underline transition-colors hover:border-primary/35 hover:bg-background/80"
                    >
                      <p className="font-medium text-foreground">
                        {event.title}
                      </p>
                      <p className="text-muted-foreground">
                        Add the first session to complete setup.
                      </p>
                    </Link>
                  ),
                )}
                {overview.needs_attention.sessions_without_ticket_types.map(
                  (item) => (
                    <Link
                      key={`${item.event_id}-${item.id}`}
                      to="/admin/events/$eventId"
                      params={{ eventId: item.event_id }}
                      search={{ section: 'tickets' }}
                      className="block rounded-2xl border border-dashed border-border/70 bg-background/55 px-4 py-3 text-sm no-underline transition-colors hover:border-primary/35 hover:bg-background/80"
                    >
                      <p className="font-medium text-foreground">
                        {item.event_title}
                      </p>
                      <p className="text-muted-foreground">
                        Add ticket types for the{' '}
                        {formatDateTime(item.starts_at)} session.
                      </p>
                    </Link>
                  ),
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[1.75rem] border-border/70 bg-card/94 shadow-none">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-3xl">Recent events</CardTitle>
                    <CardDescription className="text-base">
                      Latest event records in your current admin scope.
                    </CardDescription>
                  </div>
                  <Button asChild variant="outline" className="rounded-full">
                    <Link to="/admin/events">
                      Open events
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {overview.recent_events.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No events have been created yet.
                  </p>
                ) : (
                  overview.recent_events.map((event) => (
                    <div
                      key={event.id}
                      className="rounded-2xl border border-border/70 bg-background/70 px-4 py-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">
                            {event.title}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {event.slug}
                          </p>
                        </div>
                        <Badge variant="outline">{event.status}</Badge>
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground">
                        {event.venue_name}, {event.city}, {event.country}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Created {formatDate(event.created_at)}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-[1.75rem] border-border/70 bg-card/94 shadow-none">
            <CardHeader>
              <CardTitle className="text-3xl">Upcoming sessions</CardTitle>
              <CardDescription className="text-base">
                Scheduled sessions from the current admin scope, ordered by
                date.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
              {overview.upcoming_sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No upcoming scheduled sessions yet.
                </p>
              ) : (
                overview.upcoming_sessions.map((session) => (
                  <div
                    key={session.id}
                    className="rounded-2xl border border-border/70 bg-background/70 px-4 py-4"
                  >
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">
                        {session.event_title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDateTime(session.starts_at)}
                      </p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="outline">{session.status}</Badge>
                      <Badge variant="secondary">
                        {session.ticket_type_count} ticket types
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <div
            className={`grid gap-5 ${
              isSuperAdmin
                ? 'xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]'
                : 'xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]'
            }`}
          >
            <Card className="rounded-[1.75rem] border-border/70 bg-card/94 shadow-none">
              <CardHeader>
                <CardTitle className="text-3xl">
                  {isSuperAdmin ? 'Platform scope' : 'Publishing snapshot'}
                </CardTitle>
                <CardDescription className="text-base">
                  {isSuperAdmin
                    ? 'High-level totals from organizers, categories, and events.'
                    : 'How your current event catalog is split between published and draft work.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {isSuperAdmin ? (
                  <>
                    <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Building2 className="size-4" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {formatCount(
                              overview.stats.organizers,
                              'organizer',
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Workspaces currently on the platform.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Tag className="size-4" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {formatCount(overview.stats.categories, 'category')}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Categories available for public discovery.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <CalendarRange className="size-4" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {formatCount(overview.stats.sessions, 'session')}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {overview.stats.scheduled_sessions} currently
                            scheduled for sale.
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-foreground">
                            Published events
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Live and visible to customers right now.
                          </p>
                        </div>
                        <p className="text-2xl font-semibold text-foreground">
                          {overview.stats.published_events}
                        </p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-foreground">
                            Draft events
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Event records still being prepared.
                          </p>
                        </div>
                        <p className="text-2xl font-semibold text-foreground">
                          {overview.stats.draft_events}
                        </p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-foreground">
                            Ticket setup
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Total ticket types created across your sessions.
                          </p>
                        </div>
                        <p className="text-2xl font-semibold text-foreground">
                          {overview.stats.ticket_types}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[1.75rem] border-border/70 bg-card/94 shadow-none">
              <CardHeader>
                <CardTitle className="text-3xl">
                  {isSuperAdmin ? 'Organizer workspaces' : 'Session readiness'}
                </CardTitle>
                <CardDescription className="text-base">
                  {isSuperAdmin
                    ? 'Organizer summaries from the overview API.'
                    : 'A quick look at which upcoming sessions are ready with ticket setup.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {isSuperAdmin ? (
                  overview.organizers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No organizers have been created yet.
                    </p>
                  ) : (
                    overview.organizers.map((organizer) => (
                      <div
                        key={organizer.id}
                        className="rounded-2xl border border-border/70 bg-background/70 px-4 py-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="font-medium text-foreground">
                              {organizer.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {organizer.slug}
                            </p>
                          </div>
                          <Badge variant="outline">
                            {organizer.event_count} events
                          </Badge>
                        </div>
                        <p className="mt-3 text-sm text-muted-foreground">
                          {organizer.session_count} sessions in this workspace
                        </p>
                      </div>
                    ))
                  )
                ) : overview.upcoming_sessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Add a scheduled session to start building out ticket setup.
                  </p>
                ) : (
                  overview.upcoming_sessions.map((session) => (
                    <div
                      key={session.id}
                      className="rounded-2xl border border-border/70 bg-background/70 px-4 py-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">
                            {session.event_title}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatDateTime(session.starts_at)}
                          </p>
                        </div>
                        <Badge
                          variant={
                            session.ticket_type_count > 0
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {session.ticket_type_count > 0
                            ? 'Ready for sale'
                            : 'Needs tickets'}
                        </Badge>
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground">
                        {formatCount(session.ticket_type_count, 'ticket type')}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
