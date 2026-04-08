import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarDays, MapPin, ShieldCheck, Ticket } from "lucide-react";
import { Button } from "#/components/ui/button";
import {
  countTicketsLeft,
  formatDateLabel,
  formatPriceLabel,
  formatTimeLabel,
  getCategoryTheme,
  getSessionPriceFrom,
  normalizePublicSessions,
  sortSessionsByStart,
} from "#/features/events/display";
import { getPublicEventById } from "#/lib/api/public";

export const Route = createFileRoute("/events/$eventId")({
  loader: async ({ params }) => {
    try {
      const event = await getPublicEventById(params.eventId);
      return event;
    } catch {
      throw notFound();
    }
  },
  component: EventDetailPage,
});

function EventDetailPage() {
  const event = Route.useLoaderData();
  const sessions = sortSessionsByStart(normalizePublicSessions(event.sessions));
  const initialSessionId = sessions[0]?.id ?? null;
  const [selectedSessionId, setSelectedSessionId] = useState(initialSessionId);
  const selectedSession =
    sessions.find((session) => session.id === selectedSessionId) ?? sessions[0];
  const theme = getCategoryTheme(event.category_slug);
  const selectedSessionPrice = selectedSession
    ? formatPriceLabel(
        getSessionPriceFrom(selectedSession.ticket_types),
        event.currency,
      )
    : formatPriceLabel(event.price_from, event.currency);
  const selectedSessionTickets = selectedSession
    ? countTicketsLeft(selectedSession.ticket_types)
    : event.tickets_left;

  return (
    <main className="mx-auto max-w-7xl px-4 pb-10 pt-10 sm:pt-14">
      <div className="mb-6">
        <Link
          to="/events"
          className="text-sm font-semibold text-primary no-underline transition-colors hover:text-primary/80"
        >
          Back to all events
        </Link>
      </div>

      <section className="overflow-hidden rounded-[2rem] border border-border/70 bg-card/85 shadow-[0_30px_80px_-48px_color-mix(in_oklab,var(--foreground)_40%,transparent)]">
        <div
          className={`min-h-[260px] bg-gradient-to-br ${theme.cardGradient} p-6 text-primary-foreground sm:p-8 lg:p-10`}
        >
          <p className="inline-flex rounded-full bg-black/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/85">
            {event.category_name}
          </p>
          <h1 className="mt-5 max-w-4xl font-serif text-4xl font-semibold leading-[1.02] text-white sm:text-6xl">
            {event.title}
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-white/84 sm:text-lg">
            {event.description}
          </p>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[1.15fr_0.85fr] lg:p-8">
          <div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[1.5rem] border bg-background/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Date
                </p>
                <p className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-foreground">
                  <CalendarDays className="size-4 text-primary" />
                  {formatDateLabel(
                    selectedSession?.starts_at ?? event.next_session_starts_at,
                  )}
                </p>
              </div>
              <div className="rounded-[1.5rem] border bg-background/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Time
                </p>
                <p className="mt-3 text-sm font-medium text-foreground">
                  {formatTimeLabel(
                    selectedSession?.starts_at ?? event.next_session_starts_at,
                  )}
                </p>
              </div>
              <div className="rounded-[1.5rem] border bg-background/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Organizer
                </p>
                <p className="mt-3 text-sm font-medium text-foreground">
                  {event.organizer_name}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-[1.7rem] border bg-background/80 p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Choose session
                  </p>
                  <h2 className="mt-2 font-serif text-2xl font-semibold text-foreground">
                    Pick the date and time that fits best
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  {sessions.length} session{sessions.length === 1 ? "" : "s"}{" "}
                  available
                </p>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {sessions.map((session) => {
                  const isSelected = session.id === selectedSession?.id;

                  return (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => setSelectedSessionId(session.id)}
                      className={`rounded-[1.35rem] border px-4 py-4 text-left transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/8 shadow-sm"
                          : "border-border/70 bg-card hover:border-primary/50"
                      }`}
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Session
                      </p>
                      <p className="mt-2 font-semibold text-foreground">
                        {formatDateLabel(session.starts_at)}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatTimeLabel(session.starts_at)}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-background/90 px-3 py-1 text-foreground">
                          From{" "}
                          {formatPriceLabel(
                            getSessionPriceFrom(session.ticket_types),
                            event.currency,
                          )}
                        </span>
                        <span className="rounded-full bg-background/90 px-3 py-1 text-muted-foreground">
                          {countTicketsLeft(session.ticket_types)} tickets
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 rounded-[1.7rem] border bg-background/80 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Venue
              </p>
              <h2 className="mt-3 font-serif text-2xl font-semibold text-foreground">
                {event.venue_name}
              </h2>
              <p className="mt-3 inline-flex items-center gap-2 text-sm leading-7 text-muted-foreground">
                <MapPin className="size-4 text-primary" />
                {event.venue_address}, {event.city}, {event.country}
              </p>
            </div>

            <div className="mt-6 rounded-[1.7rem] border bg-background/80 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                What this page should communicate
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {[
                  "Remaining tickets visible before checkout",
                  "Fast trust signals like organizer, venue, and date",
                  "Cleaner route into payment and e-ticket delivery",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-[1.25rem] border bg-card p-4"
                  >
                    <p className="text-sm leading-6 text-muted-foreground">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className="rounded-[1.8rem] border bg-background/80 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Ticket box
            </p>
            <div className="mt-4 rounded-[1.5rem] border bg-card p-5">
              <p className="text-sm text-muted-foreground">From</p>
              <p className="mt-2 font-serif text-4xl font-semibold text-foreground">
                {selectedSessionPrice}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {selectedSessionTickets > 0
                  ? `${selectedSessionTickets} tickets still available`
                  : "Demand is high for this event"}
              </p>
            </div>

            <div className="mt-4 rounded-[1.5rem] border bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Selected session
              </p>
              {selectedSession ? (
                <>
                  <p className="mt-3 font-semibold text-foreground">
                    {formatDateLabel(selectedSession.starts_at)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatTimeLabel(selectedSession.starts_at)}
                  </p>

                  <div className="mt-4 space-y-3">
                    {(selectedSession.ticket_types ?? []).map((ticketType) => (
                      <div
                        key={ticketType.id}
                        className="rounded-[1.15rem] border border-border/70 bg-background/70 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-foreground">
                              {ticketType.name}
                            </p>
                            {ticketType.description ? (
                              <p className="mt-1 text-sm text-muted-foreground">
                                {ticketType.description}
                              </p>
                            ) : null}
                          </div>
                          <p className="font-semibold text-foreground">
                            {formatPriceLabel(ticketType.price, event.currency)}
                          </p>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span className="rounded-full bg-card px-3 py-1">
                            {ticketType.quantity} available
                          </span>
                          <span className="rounded-full bg-card px-3 py-1">
                            Max {ticketType.max_per_order} per order
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  Session options will appear here.
                </p>
              )}
            </div>

            <div className="mt-4 space-y-3 rounded-[1.5rem] border bg-card p-5 text-sm text-muted-foreground">
              <p className="inline-flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" />
                Secure checkout and immediate confirmation flow
              </p>
              <p className="inline-flex items-center gap-2">
                <Ticket className="size-4 text-primary" />
                E-ticket delivery and order tracking area
              </p>
            </div>

            <div className="mt-5 space-y-3">
              <Button size="lg" className="w-full rounded-full">
                Get tickets
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full rounded-full bg-card"
              >
                Save for later
              </Button>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
