import { useQuery } from '@tanstack/react-query';
import { Link, createFileRoute, redirect } from '@tanstack/react-router';
import QRCode from 'react-qr-code';
import { RefreshCw } from 'lucide-react';

import { Badge } from '#/components/ui/badge';
import { Button } from '#/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '#/components/ui/sheet';
import { ScrollArea } from '#/components/ui/scroll-area';
import {
  formatDateRangeLabel,
  formatTimeRangeLabel,
} from '#/features/events/display';
import { listMyTickets, type Ticket } from '#/lib/api/tickets';
import { getAuthSession, useAuthSession } from '#/lib/auth';

export const Route = createFileRoute('/tickets/')({
  beforeLoad: () => {
    if (typeof window === 'undefined') {
      return;
    }

    const session = getAuthSession();
    if (!session) {
      throw redirect({ to: '/login' });
    }
  },
  component: TicketsPage,
});

function TicketsSkeleton({ items = 2 }: { items?: number }) {
  return (
    <section className="mt-8 space-y-4">
      <div className="flex flex-col gap-3 rounded-[1.75rem] border border-border/70 bg-card/90 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-3 w-28 rounded-full bg-muted/60" />
          <div className="h-3 w-44 rounded-full bg-muted/50" />
        </div>
        <div className="h-10 w-28 rounded-full bg-muted/50" />
      </div>

      {Array.from({ length: items }).map((_, index) => (
        <article
          key={`tickets-skeleton-${index}`}
          className="rounded-[1.75rem] border border-border/70 bg-card/90 p-5 shadow-sm"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="h-4 w-40 rounded-full bg-muted/60" />
              <div className="h-3 w-56 rounded-full bg-muted/50" />
            </div>
            <div className="h-10 w-32 rounded-full bg-muted/60" />
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
            <div className="space-y-3">
              <div className="rounded-[1.25rem] border border-border/70 bg-background/70 p-4">
                <div className="h-3 w-40 rounded-full bg-muted/50" />
                <div className="mt-3 h-3 w-56 rounded-full bg-muted/50" />
                <div className="mt-2 h-3 w-44 rounded-full bg-muted/40" />
              </div>
              <div className="rounded-[1.25rem] border border-border/70 bg-background/70 p-4">
                <div className="h-3 w-36 rounded-full bg-muted/50" />
                <div className="mt-3 h-3 w-52 rounded-full bg-muted/50" />
                <div className="mt-2 h-3 w-40 rounded-full bg-muted/40" />
              </div>
            </div>
            <div className="flex justify-start lg:justify-end">
              <div className="size-32 rounded-[1.25rem] border border-border/70 bg-background/70 p-4">
                <div className="h-full w-full rounded-lg bg-muted/40" />
              </div>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}

type TicketGroup = {
  id: string;
  order_id: string;
  order_number: string;
  order_status: string;
  event_title: string;
  event_id: string;
  session_id: string;
  session_starts_at: string;
  session_ends_at: string;
  customer_name: string;
  customer_email: string;
  tickets: Ticket[];
};

function groupTickets(tickets: Ticket[]) {
  const groups = new Map<string, TicketGroup>();

  for (const ticket of tickets) {
    const key = `${ticket.order_id}:${ticket.event_id}:${ticket.session_id}`;
    const existing = groups.get(key);
    if (existing) {
      existing.tickets.push(ticket);
      continue;
    }

    groups.set(key, {
      id: key,
      order_id: ticket.order_id,
      order_number: ticket.order_number,
      order_status: ticket.order_status,
      event_title: ticket.event_title,
      event_id: ticket.event_id,
      session_id: ticket.session_id,
      session_starts_at: ticket.session_starts_at,
      session_ends_at: ticket.session_ends_at,
      customer_name: ticket.customer_name,
      customer_email: ticket.customer_email,
      tickets: [ticket],
    });
  }

  return Array.from(groups.values()).map((group) => ({
    ...group,
    tickets: group.tickets.slice().sort((a, b) => a.code.localeCompare(b.code)),
  }));
}

function TicketGroupCard({ group }: { group: TicketGroup }) {
  const checkedInCount = group.tickets.filter((ticket) =>
    Boolean(ticket.checked_in_at),
  ).length;
  const allCheckedIn =
    group.tickets.length > 0 && checkedInCount === group.tickets.length;
  const partiallyCheckedIn = checkedInCount > 0 && !allCheckedIn;

  const statusLabel = allCheckedIn
    ? 'Checked in'
    : partiallyCheckedIn
      ? 'Partially checked'
      : 'Valid';

  return (
    <article className="rounded-[1.75rem] border border-border/70 bg-card/90 p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{group.event_title}</p>
            <Badge variant="outline" className="rounded-full">
              {statusLabel}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {formatDateRangeLabel(group.session_starts_at, group.session_ends_at)} •{' '}
            {formatTimeRangeLabel(group.session_starts_at, group.session_ends_at)}
          </p>
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button className="rounded-full">Show tickets</Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-[2rem]">
            <SheetHeader className="pr-10">
              <SheetTitle>{group.event_title}</SheetTitle>
              <SheetDescription>
                {group.tickets.length} ticket{group.tickets.length === 1 ? '' : 's'} •{' '}
                Order {group.order_number}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild variant="outline" className="rounded-full bg-background">
                <Link to="/orders/$orderId" params={{ orderId: group.order_id }}>
                  View receipt
                </Link>
              </Button>
            </div>

            <ScrollArea className="mt-5 h-[min(65vh,36rem)] pr-2">
              <div className="grid gap-4 pb-6 lg:grid-cols-2">
                {group.tickets.map((ticket, index) => {
                  const isCheckedIn = Boolean(ticket.checked_in_at);

                  return (
                    <div
                      key={ticket.id}
                      className="rounded-[1.75rem] border border-border/70 bg-card/70 p-5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {ticket.ticket_type_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Ticket {index + 1} of {group.tickets.length}
                          </p>
                        </div>
                        <Badge variant="outline" className="rounded-full">
                          {isCheckedIn ? 'Checked in' : 'Valid'}
                        </Badge>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
                        <div className="space-y-3">
                          <div className="rounded-[1.25rem] border border-border/70 bg-background/70 p-4">
                            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                              Code
                            </p>
                            <p className="mt-2 break-all text-sm font-semibold text-foreground">
                              {ticket.code}
                            </p>
                            {ticket.checked_in_at ? (
                              <p className="mt-2 text-xs text-muted-foreground">
                                Checked in{' '}
                                {new Date(ticket.checked_in_at).toLocaleString()}
                              </p>
                            ) : null}
                          </div>
                          <div className="rounded-[1.25rem] border border-border/70 bg-background/70 p-4">
                            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                              Session
                            </p>
                            <p className="mt-2 text-sm font-semibold text-foreground">
                              {formatDateRangeLabel(
                                ticket.session_starts_at,
                                ticket.session_ends_at,
                              )}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {formatTimeRangeLabel(
                                ticket.session_starts_at,
                                ticket.session_ends_at,
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex justify-start sm:justify-end">
                          <div className="rounded-[1.25rem] border border-border/70 bg-background/70 p-4">
                            <div className="size-32 rounded-lg bg-background p-2">
                              <QRCode
                                value={ticket.code}
                                size={128}
                                bgColor="transparent"
                                fgColor="currentColor"
                              />
                            </div>
                            <p className="mt-3 text-center text-xs text-muted-foreground">
                              Scan at entry
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
        <div className="space-y-3">
          <div className="rounded-[1.25rem] border border-border/70 bg-background/70 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Order
            </p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {group.order_number}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {group.tickets.length} ticket{group.tickets.length === 1 ? '' : 's'} •{' '}
              {group.order_status}
            </p>
          </div>

          <div className="rounded-[1.25rem] border border-border/70 bg-background/70 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Buyer
            </p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {group.customer_name}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {group.customer_email}
            </p>
            {partiallyCheckedIn ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {checkedInCount} of {group.tickets.length} checked in
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex justify-start lg:justify-end">
          <div className="rounded-[1.25rem] border border-border/70 bg-background/70 p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Tickets
            </p>
            <p className="mt-3 text-3xl font-semibold text-foreground">
              {group.tickets.length}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Tap “Show tickets” for QR codes
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

function TicketsPage() {
  const session = useAuthSession();

  const {
    data: apiTickets = [],
    isLoading: isApiOrdersLoading,
    error: apiOrdersError,
    refetch: refetchApiOrders,
  } = useQuery({
    queryKey: ['me', 'tickets', session?.access_token],
    enabled: Boolean(session?.access_token),
    queryFn: () => listMyTickets(session!.access_token, 100),
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  });

  const isInitialLoading = isApiOrdersLoading && apiTickets.length === 0;

  if (!session || isInitialLoading) {
    return (
      <main className="mx-auto max-w-5xl px-4 pb-12 pt-10 sm:pt-14">
        <section className="rounded-[2rem] border border-border/70 bg-card/90 p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            Tickets
          </p>
          <h1 className="mt-3 font-serif text-4xl font-semibold text-foreground">
            Your tickets
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
            Loading your ticket history...
          </p>
        </section>

        <TicketsSkeleton items={2} />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 pb-12 pt-10 sm:pt-14">
      <section className="rounded-[2rem] border border-border/70 bg-card/90 p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          Tickets
        </p>
        <h1 className="mt-3 font-serif text-4xl font-semibold text-foreground">
          Your tickets
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
          Your QR codes are ready. Present one at the door to check in.
        </p>
      </section>

      <section className="mt-8 space-y-4">
        <div className="flex flex-col gap-3 rounded-[1.75rem] border border-border/70 bg-card/90 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Account tickets
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {apiOrdersError instanceof Error
                ? apiOrdersError.message
                : isApiOrdersLoading
                  ? 'Refreshing your tickets...'
                  : apiTickets.length > 0
                    ? `${apiTickets.length} ticket${apiTickets.length === 1 ? '' : 's'} found`
                    : 'No tickets yet.'}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="rounded-full bg-background"
            onClick={() => void refetchApiOrders()}
          >
            <RefreshCw className="size-4" />
            Refresh
          </Button>
        </div>

        {groupTickets(apiTickets).map((group) => (
          <TicketGroupCard key={group.id} group={group} />
        ))}
      </section>

      {!isApiOrdersLoading && apiTickets.length === 0 ? (
        <section className="mt-8 rounded-[1.75rem] border border-dashed border-border/70 bg-card/70 p-8 text-center">
          <p className="text-lg font-semibold text-foreground">
            No tickets yet.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Once you complete a checkout, your paid tickets will show up here.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Button asChild className="rounded-full">
              <Link to="/events">Browse events</Link>
            </Button>
          </div>
        </section>
      ) : null}
    </main>
  );
}
