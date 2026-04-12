import { Link } from "@tanstack/react-router";
import { useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  MoveRight,
} from "lucide-react";
import { Button } from "#/components/ui/button";
import type { ApiCategory, ApiPublicEventWithSessions } from "#/lib/api/public";
import {
  buildCategorySummaries,
  formatDateLabel,
  formatPriceLabel,
  formatTimeLabel,
  getCategoryTheme,
  getEventBannerImage,
  groupEventsByOrganizer,
  groupEventsByVenue,
  normalizePublicSessions,
  sortSessionsByStart,
} from "#/features/events/display";
import { SessionChips } from "#/features/events/components/SessionChips";

type HomeDiscoveryPageProps = {
  categories: ApiCategory[] | null | undefined;
  events: ApiPublicEventWithSessions[] | null | undefined;
};

function EventRailCard({ event }: { event: ApiPublicEventWithSessions }) {
  const theme = getCategoryTheme(event.category_slug);
  const primarySession = sortSessionsByStart(event.sessions ?? [])[0];
  const bannerImage = getEventBannerImage(event);

  return (
    <article className="min-w-[280px] max-w-xs snap-start overflow-hidden rounded-[1.8rem] border border-white/10 bg-card/90 shadow-lg">
      <div
        className={`relative h-44 bg-linear-to-br ${theme.cardGradient} p-5 text-primary-foreground`}
      >
        {bannerImage ? (
          <>
            <img
              src={bannerImage}
              alt={event.title}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
          </>
        ) : null}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-black/70 to-transparent" />
        <div className="relative flex h-full flex-col justify-between">
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-full bg-black/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/95 backdrop-blur-sm">
              {event.category_name}
            </span>
            <span className="rounded-full bg-white/16 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/95 backdrop-blur-sm">
              {formatPriceLabel(event.price_from, event.currency)}
            </span>
          </div>
          <div className="relative z-10">
            <p className="inline-flex items-center gap-2 rounded-full bg-black/20 px-3 py-1 text-xs text-white/90 backdrop-blur-sm">
              <MapPin className="size-3.5" />
              {event.venue_name}
            </p>
          </div>
        </div>
      </div>
      <div className="p-5">
        <h3 className="font-serif text-2xl font-semibold text-foreground">
          {event.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-7 text-muted-foreground">
          {event.summary}
        </p>
        <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
          <p className="inline-flex items-center gap-2">
            <Clock3 className="size-4 text-primary" />
            {formatDateLabel(
              primarySession?.starts_at ?? event.next_session_starts_at,
            )}
          </p>
          <p>
            {formatTimeLabel(
              primarySession?.starts_at ?? event.next_session_starts_at,
            )}{" "}
            in {event.city}
          </p>
        </div>
        <SessionChips
          sessions={event.sessions ?? []}
          maxVisible={2}
          className="mt-4"
        />
        <div className="mt-5">
          <Button
            asChild
            variant="outline"
            className="w-full justify-between rounded-full bg-background"
          >
            <Link to="/events/$eventId" params={{ eventId: event.id }}>
              View event
              <MoveRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

function RailSection({
  label,
  title,
  description,
  ctaLabel,
  ctaTo,
  events,
}: {
  label: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaTo: string;
  events: ApiPublicEventWithSessions[];
}) {
  const railRef = useRef<HTMLDivElement | null>(null);

  function scrollRail(direction: "left" | "right") {
    const rail = railRef.current;

    if (!rail) {
      return;
    }

    const amount = Math.max(rail.clientWidth * 0.82, 320);

    rail.scrollBy({
      left: direction === "right" ? amount : -amount,
      behavior: "smooth",
    });
  }

  if (events.length === 0) {
    return null;
  }

  return (
    <section className="rounded-[2rem] border border-border/70 bg-card/88 p-5 shadow-md sm:p-6">
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            {label}
          </p>
          <h2 className="mt-2 font-serif text-3xl font-semibold text-foreground">
            {title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
            {description}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-full bg-background"
            onClick={() => scrollRail("left")}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-full bg-background"
            onClick={() => scrollRail("right")}
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button asChild variant="ghost" className="rounded-full">
            <Link to={ctaTo}>{ctaLabel}</Link>
          </Button>
        </div>
      </div>

      <div
        ref={railRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {events.map((event) => (
          <EventRailCard key={event.id} event={event} />
        ))}
      </div>
    </section>
  );
}

export function HomeDiscoveryPage({
  categories,
  events,
}: HomeDiscoveryPageProps) {
  const safeCategories = categories ?? [];
  const safeEvents = events ?? [];
  const groupedCategories = buildCategorySummaries(safeCategories, safeEvents);
  const featuredEvents = safeEvents.slice(0, 4);
  const heroEvent = featuredEvents[0];
  const supportingEvents = featuredEvents.slice(1);
  const organizerRails = groupEventsByOrganizer(safeEvents).slice(0, 2);
  const venueRails = groupEventsByVenue(safeEvents).slice(0, 2);

  return (
    <main className="mx-auto max-w-7xl px-4 pb-12 pt-8 sm:pt-12">
      <section className="rounded-[2rem] border border-border/70 bg-card/92 p-5 shadow-lg sm:p-6">
        <div className="flex flex-col gap-4 border-b border-border/60 pb-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              Featured this week
            </p>
            <h1 className="mt-2 font-serif text-2xl font-semibold text-foreground sm:text-3xl">
              Start with standout picks.
            </h1>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Open a strong event first, then move into categories, venues, and
              the full event directory.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild className="rounded-full px-5">
              <Link to="/events">Browse all events</Link>
            </Button>
            {heroEvent ? (
              <Button
                asChild
                variant="outline"
                className="rounded-full bg-background px-5"
              >
                <Link to="/events/$eventId" params={{ eventId: heroEvent.id }}>
                  Open featured event
                </Link>
              </Button>
            ) : null}
          </div>
        </div>

        {heroEvent ? (
          <div className="mt-5 grid gap-4 lg:grid-cols-[1.35fr_0.85fr_0.85fr]">
            {[heroEvent, ...supportingEvents].map((event, index) => {
              const theme = getCategoryTheme(event.category_slug);
              const bannerImage = getEventBannerImage(event);
              const primarySession = sortSessionsByStart(
                normalizePublicSessions(event.sessions),
              )[0];

              return (
                <Link
                  key={event.id}
                  to="/events/$eventId"
                  params={{ eventId: event.id }}
                  className={`group overflow-hidden rounded-[1.7rem] border border-border/70 bg-card/95 no-underline shadow-md transition-transform hover:-translate-y-1 ${
                    index === 0 ? "lg:row-span-2" : ""
                  }`}
                >
                  <div
                    className={`relative ${index === 0 ? "h-60" : "h-36"} bg-linear-to-br ${theme.cardGradient} p-5 text-primary-foreground`}
                  >
                    {bannerImage ? (
                      <>
                        <img
                          src={bannerImage}
                          alt={event.title}
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                      </>
                    ) : null}
                    <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent" />
                    <div className="relative flex h-full flex-col justify-between">
                      <div className="flex items-start justify-between gap-3">
                        <span className="rounded-full bg-black/25 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/95 backdrop-blur-sm">
                          {event.category_name}
                        </span>
                        <span className="rounded-full bg-white/18 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/95 backdrop-blur-sm">
                          {formatPriceLabel(event.price_from, event.currency)}
                        </span>
                      </div>

                      <div>
                        <p className="inline-flex items-center gap-2 rounded-full bg-black/20 px-3 py-1 text-xs text-white/90 backdrop-blur-sm">
                          <MapPin className="size-3.5" />
                          {event.venue_name}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 p-5">
                    <div>
                      <h2
                        className={`font-serif font-semibold text-foreground ${
                          index === 0
                            ? "text-3xl leading-tight"
                            : "text-2xl leading-tight"
                        }`}
                      >
                        {event.title}
                      </h2>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {formatDateLabel(
                          primarySession?.starts_at ??
                            event.next_session_starts_at,
                        )}
                        {index === 0
                          ? ` - ${formatTimeLabel(
                              primarySession?.starts_at ??
                                event.next_session_starts_at,
                            )}`
                          : ""}
                      </p>
                    </div>

                    <p className="line-clamp-2 text-sm leading-7 text-muted-foreground">
                      {event.summary}
                    </p>

                    <SessionChips
                      sessions={event.sessions ?? []}
                      maxVisible={index === 0 ? 3 : 2}
                    />

                    <p className="inline-flex items-center gap-2 text-sm font-medium text-primary">
                      Open event
                      <ChevronRight className="size-4 transition-transform group-hover:translate-x-1" />
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="mt-5 rounded-[1.7rem] border border-dashed border-border/70 bg-background/60 p-8 text-center">
            <h2 className="font-serif text-2xl font-semibold text-foreground">
              No published events yet.
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              The public feed is connected. As soon as published events with
              scheduled sessions exist in the API, they will appear here.
            </p>
          </div>
        )}
      </section>

      <section className="mt-10">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              Browse categories
            </p>
            <h2 className="mt-2 font-serif text-3xl font-semibold text-foreground sm:text-4xl">
              Pick a lane, then slide through the best options.
            </h2>
          </div>
          <Button asChild variant="outline" className="rounded-full bg-card/80">
            <Link to="/events">All events</Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {groupedCategories.map((category) => (
            <Link
              key={category.slug}
              to="/categories/$categorySlug"
              params={{ categorySlug: category.slug }}
              className="group flex h-full flex-col overflow-hidden rounded-[1.85rem] border border-border/70 bg-card/90 no-underline shadow-md transition-transform hover:-translate-y-1"
            >
              <div className="relative h-44 overflow-hidden">
                <div
                  className={`absolute inset-0 bg-linear-to-r ${category.theme.imageOverlay}`}
                  style={{
                    backgroundImage: category.image_url
                      ? `url(${category.image_url})`
                      : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-black/30" />
                <div className="relative flex h-full items-start justify-between gap-4 p-5">
                  <span className="rounded-full border border-white/30 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-stone-700 backdrop-blur-sm">
                    {category.event_count} events
                  </span>
                </div>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h3 className="font-serif text-3xl font-semibold leading-tight text-foreground">
                  {category.name}
                </h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {category.description}
                </p>
                <p className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-medium text-primary">
                  Open category
                  <ChevronRight className="size-4 transition-transform group-hover:translate-x-1" />
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10 space-y-8">
        {organizerRails.map((rail) => (
          <RailSection
            key={rail.organizer_name}
            label="Event series"
            title={rail.organizer_name}
            description="Follow recurring organizers and curated event drops instead of browsing one giant undifferentiated list."
            ctaLabel="View all"
            ctaTo="/events"
            events={rail.events}
          />
        ))}

        {venueRails.map((rail) => (
          <RailSection
            key={`${rail.venue_name}-${rail.city}`}
            label="Venue collection"
            title={`${rail.venue_name}, ${rail.city}`}
            description="Some people browse by where they want to go. These rails help them discover venue-based programming quickly."
            ctaLabel="Explore venue picks"
            ctaTo="/events"
            events={rail.events}
          />
        ))}
      </section>
    </main>
  );
}
