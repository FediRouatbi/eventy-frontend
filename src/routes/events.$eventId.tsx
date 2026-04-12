import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  MapPin,
  Minus,
  Plus,
  ShieldCheck,
  Ticket,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "#/components/ui/button";
import {
  countTicketsLeft,
  formatDateRangeLabel,
  formatPriceLabel,
  formatTimeRangeLabel,
  getCategoryTheme,
  getEventBannerImage,
  getEventPosterImage,
  getSessionPriceFrom,
  normalizePublicSessions,
  sortSessionsByStart,
} from "#/features/events/display";
import { addItemsToCart, saveTicketSelection } from "#/lib/cart";
import { publicEventDetailQueryOptions } from "#/lib/api/public";
import { queryClient } from "#/lib/query-client";

export const Route = createFileRoute("/events/$eventId")({
  loader: async ({ params }) => {
    try {
      await queryClient.ensureQueryData(
        publicEventDetailQueryOptions(params.eventId),
      );
    } catch {
      throw notFound();
    }
  },
  component: EventDetailPage,
});

function EventDetailPage() {
  const { eventId } = Route.useParams();
  const { data: event } = useSuspenseQuery(
    publicEventDetailQueryOptions(eventId),
  );
  const sessions = sortSessionsByStart(normalizePublicSessions(event.sessions));
  const initialSessionId = sessions[0]?.id ?? null;
  const [selectedSessionId, setSelectedSessionId] = useState(initialSessionId);
  const selectedSession =
    sessions.find((session) => session.id === selectedSessionId) ?? sessions[0];
  const [ticketSelections, setTicketSelections] = useState<Record<string, number>>(
    {},
  );
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
  const bannerImage = getEventBannerImage(event);
  const posterImage = getEventPosterImage(event);
  const selectedTicketCount = Object.values(ticketSelections).reduce(
    (total, quantity) => total + quantity,
    0,
  );
  const selectedTicketSubtotal = useMemo(
    () =>
      (selectedSession?.ticket_types ?? []).reduce(
        (total, ticketType) =>
          total + ticketType.price * (ticketSelections[String(ticketType.id)] ?? 0),
        0,
      ),
    [selectedSession, ticketSelections],
  );

  useEffect(() => {
    setTicketSelections({});
  }, [selectedSessionId]);

  function updateTicketSelection(
    ticketTypeId: string,
    nextQuantity: number,
    maxPerOrder: number,
    availableQuantity: number,
  ) {
    const clampedQuantity = Math.max(
      0,
      Math.min(nextQuantity, maxPerOrder, availableQuantity),
    );

    setTicketSelections((current) => ({
      ...current,
      [ticketTypeId]: clampedQuantity,
    }));
  }

  async function handleGetTickets() {
    if (!selectedSession || selectedTicketCount === 0) {
      toast.error("Select tickets first", {
        description: "Choose at least one ticket type to continue.",
      });
      return;
    }

    const items = (selectedSession.ticket_types ?? [])
      .map((ticketType) => ({
        ticketType,
        quantity: ticketSelections[String(ticketType.id)] ?? 0,
      }))
      .filter((entry) => entry.quantity > 0)
      .map((entry) => ({
        ticket_type_id: String(entry.ticketType.id),
        ticket_type_name: entry.ticketType.name,
        quantity: entry.quantity,
        unit_price: entry.ticketType.price,
        currency: event.currency,
        event_id: event.id,
        event_title: event.title,
        session_id: String(selectedSession.id),
        session_starts_at: selectedSession.starts_at,
        session_ends_at: selectedSession.ends_at,
        max_per_order: entry.ticketType.max_per_order,
        available_quantity: entry.ticketType.quantity,
      }));

    try {
      const cart = await addItemsToCart(items);
      const totalTickets = cart.items.reduce(
        (sum, item) => sum + item.quantity,
        0,
      );

      toast.success("Tickets reserved in cart", {
        description: `${totalTickets} ticket${totalTickets === 1 ? "" : "s"} currently held for 10 minutes. You can keep browsing and checkout from the cart in the navbar.`,
      });
    } catch (error) {
      toast.error("Unable to reserve tickets", {
        description:
          error instanceof Error
            ? error.message
            : "Please try again with a lower quantity.",
      });
    }
  }

  function handleSaveForLater() {
    if (!selectedSession || selectedTicketCount === 0) {
      toast.error("Select tickets first", {
        description: "Choose at least one ticket type before saving.",
      });
      return;
    }

    saveTicketSelection({
      event_id: event.id,
      event_title: event.title,
      session_id: String(selectedSession.id),
      session_starts_at: selectedSession.starts_at,
      session_ends_at: selectedSession.ends_at,
      selections: (selectedSession.ticket_types ?? [])
        .map((ticketType) => ({
          ticket_type_id: String(ticketType.id),
          ticket_type_name: ticketType.name,
          quantity: ticketSelections[String(ticketType.id)] ?? 0,
          unit_price: ticketType.price,
          currency: event.currency,
          max_per_order: ticketType.max_per_order,
          available_quantity: ticketType.quantity,
        }))
        .filter((item) => item.quantity > 0),
    });

    toast.success("Saved for later", {
      description: "These ticket selections are saved locally for later.",
    });
  }

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
          className={`relative min-h-[260px] bg-gradient-to-br ${theme.cardGradient} p-6 text-primary-foreground sm:p-8 lg:p-10`}
        >
          {bannerImage ? (
            <>
              <img
                src={bannerImage}
                alt={event.title}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/30" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/20" />
            </>
          ) : null}
          <div className="relative flex h-full flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-4xl">
              <p className="inline-flex rounded-full bg-black/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/85 backdrop-blur-sm">
                {event.category_name}
              </p>
              <h1 className="mt-5 max-w-4xl font-serif text-4xl font-semibold leading-[1.02] text-white sm:text-6xl">
                {event.title}
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-white/84 sm:text-lg">
                {event.description}
              </p>
            </div>
            {posterImage ? (
              <div className="hidden lg:block">
                <div className="overflow-hidden rounded-[1.4rem] border border-white/20 bg-black/20 shadow-2xl backdrop-blur-sm">
                  <img
                    src={posterImage}
                    alt={`${event.title} poster`}
                    className="h-56 w-40 object-cover"
                  />
                </div>
              </div>
            ) : null}
          </div>
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
                  {formatDateRangeLabel(
                    selectedSession?.starts_at ?? event.next_session_starts_at,
                    selectedSession?.ends_at,
                  )}
                </p>
              </div>
              <div className="rounded-[1.5rem] border bg-background/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Time
                </p>
                <p className="mt-3 text-sm font-medium text-foreground">
                  {formatTimeRangeLabel(
                    selectedSession?.starts_at ?? event.next_session_starts_at,
                    selectedSession?.ends_at,
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
                  {sessions.length} session{sessions.length === 1 ? "" : "s"} available
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
                        {formatDateRangeLabel(session.starts_at, session.ends_at)}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatTimeRangeLabel(session.starts_at, session.ends_at)}
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
                Ticket selection
              </p>
              {selectedSession ? (
                <>
                  <p className="mt-3 font-semibold text-foreground">
                    {formatDateRangeLabel(
                      selectedSession.starts_at,
                      selectedSession.ends_at,
                    )}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatTimeRangeLabel(
                      selectedSession.starts_at,
                      selectedSession.ends_at,
                    )}
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
                        <div className="mt-4 flex items-center justify-between gap-3">
                          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-2 py-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-8 rounded-full"
                              onClick={() =>
                                updateTicketSelection(
                                  String(ticketType.id),
                                  (ticketSelections[String(ticketType.id)] ?? 0) - 1,
                                  ticketType.max_per_order,
                                  ticketType.quantity,
                                )
                              }
                            >
                              <Minus className="size-4" />
                            </Button>
                            <span className="min-w-6 text-center text-sm font-medium text-foreground">
                              {ticketSelections[String(ticketType.id)] ?? 0}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-8 rounded-full"
                              onClick={() =>
                                updateTicketSelection(
                                  String(ticketType.id),
                                  (ticketSelections[String(ticketType.id)] ?? 0) + 1,
                                  ticketType.max_per_order,
                                  ticketType.quantity,
                                )
                              }
                              disabled={ticketType.quantity === 0}
                            >
                              <Plus className="size-4" />
                            </Button>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {(ticketSelections[String(ticketType.id)] ?? 0) > 0
                              ? formatPriceLabel(
                                  ticketType.price *
                                    (ticketSelections[String(ticketType.id)] ?? 0),
                                  event.currency,
                                )
                              : "Select quantity"}
                          </p>
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
              <div className="flex items-center justify-between rounded-[1rem] border border-border/70 bg-background/70 px-4 py-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    In cart
                  </p>
                  <p className="mt-1 text-sm text-foreground">
                    {selectedTicketCount} ticket{selectedTicketCount === 1 ? "" : "s"} selected
                  </p>
                </div>
                <p className="font-semibold text-foreground">
                  {formatPriceLabel(selectedTicketSubtotal, event.currency)}
                </p>
              </div>
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
              <Button
                size="lg"
                className="w-full rounded-full"
                onClick={() => void handleGetTickets()}
              >
                Add to cart
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full rounded-full bg-card"
                onClick={handleSaveForLater}
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
