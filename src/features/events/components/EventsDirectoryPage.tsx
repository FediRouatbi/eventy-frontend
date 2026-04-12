import { Link } from "@tanstack/react-router";
import { useDeferredValue, useState } from "react";
import { MapPin, Search } from "lucide-react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import type { ApiCategory, ApiPublicEventWithSessions } from "#/lib/api/public";
import {
  formatDateLabel,
  formatPriceLabel,
  getCategoryTheme,
  getEventBannerImage,
  getPrimarySession,
  normalizePublicSessions,
} from "#/features/events/display";
import { SessionChips } from "#/features/events/components/SessionChips";

type EventsDirectoryPageProps = {
  categories: ApiCategory[] | null | undefined;
  events: ApiPublicEventWithSessions[] | null | undefined;
  introLabel: string;
  introTitle: string;
  introDescription: string;
};

export function EventsDirectoryPage({
  categories,
  events,
  introLabel,
  introTitle,
  introDescription,
}: EventsDirectoryPageProps) {
  const safeCategories = categories ?? [];
  const safeEvents = events ?? [];
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const deferredQuery = useDeferredValue(query);

  const cities = [...new Set(safeEvents.map((event) => event.city))].sort();
  const normalizedQuery = deferredQuery.trim().toLowerCase();

  const filteredEvents = safeEvents.filter((event) => {
    const matchesQuery =
      normalizedQuery.length === 0 ||
      [
        event.title,
        event.summary,
        event.category_name,
        event.organizer_name,
        event.city,
        event.venue_name,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);

    const matchesCategory =
      categoryFilter === "all" || event.category_slug === categoryFilter;
    const matchesCity = cityFilter === "all" || event.city === cityFilter;

    return matchesQuery && matchesCategory && matchesCity;
  });

  return (
    <main className="mx-auto max-w-7xl px-4 pb-10 pt-10 sm:pt-14">
      <section className="rounded-[2rem] border border-border/70 bg-card/88 p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          {introLabel}
        </p>
        <h1 className="mt-3 font-serif text-4xl font-semibold text-foreground sm:text-5xl">
          {introTitle}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-muted-foreground">
          {introDescription}
        </p>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_0.8fr_0.8fr]">
          <label className="flex items-center gap-3 rounded-4xl border border-border/70 bg-background/82 px-4 py-2">
            <Search className="size-4 text-primary" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by event, organizer, venue, or city"
              className="border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0"
            />
          </label>

          <label className="rounded-4xl border border-border/70 bg-background/82 px-4 py-3 text-sm text-muted-foreground">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em]">
              Category
            </span>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {safeCategories.map((category) => (
                  <SelectItem key={category.slug} value={category.slug}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className="rounded-4xl border border-border/70 bg-background/82 px-4 py-3 text-sm text-muted-foreground">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em]">
              City
            </span>
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0">
                <SelectValue placeholder="All cities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All cities</SelectItem>
                {cities.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          {safeCategories.map((category) => (
            <Button
              key={category.slug}
              type="button"
              variant={categoryFilter === category.slug ? "default" : "outline"}
              onClick={() =>
                setCategoryFilter((current) =>
                  current === category.slug ? "all" : category.slug,
                )
              }
              className="rounded-full"
            >
              {category.name}
            </Button>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              All events
            </p>
            <h2 className="mt-2 font-serif text-3xl font-semibold text-foreground">
              {filteredEvents.length} matching events
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-7 text-muted-foreground">
            This page is the fast utility layer: search, narrow, compare, then
            jump into the event page when you find the right fit.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredEvents.map((event) => {
            const theme = getCategoryTheme(event.category_slug);
            const primarySession = getPrimarySession(event);
            const bannerImage = getEventBannerImage(event);

            return (
              <article
                key={event.id}
                className="flex flex-col overflow-hidden rounded-[1.55rem] border border-border/70 bg-card/90 shadow-sm"
              >
                <div className={`relative h-28 bg-linear-to-br ${theme.cardGradient}`}>
                  {bannerImage ? (
                    <>
                      <img
                        src={bannerImage}
                        alt={event.title}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                    </>
                  ) : null}
                </div>
                <div className="grid flex-1 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {event.category_name}
                      </p>
                      <h3 className="mt-2 font-serif text-2xl font-semibold text-foreground">
                        {event.title}
                      </h3>
                    </div>
                    <span className="rounded-full border bg-accent px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-accent-foreground">
                      {formatPriceLabel(event.price_from, event.currency)}
                    </span>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm leading-7 text-muted-foreground">
                    {event.summary}
                  </p>
                  <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
                    <p>
                      {formatDateLabel(
                        primarySession?.starts_at ??
                          event.next_session_starts_at,
                      )}
                    </p>
                    <p className="inline-flex items-center gap-2">
                      <MapPin className="size-4 text-primary" />
                      {event.venue_name}, {event.city}
                    </p>
                    <p>{event.organizer_name}</p>
                  </div>
                  <SessionChips
                    sessions={normalizePublicSessions(event.sessions)}
                    maxVisible={3}
                    className="mt-4"
                  />
                  <div className="mt-5">
                    <Button
                      asChild
                      variant="outline"
                      className="w-full justify-between rounded-full bg-background"
                    >
                      <Link
                        to="/events/$eventId"
                        params={{ eventId: event.id }}
                      >
                        View event
                      </Link>
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {filteredEvents.length === 0 ? (
          <div className="mt-6 rounded-[1.6rem] border border-dashed border-border/70 bg-card/70 p-8 text-center">
            <p className="text-lg font-semibold text-foreground">
              No events match these filters yet.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Try clearing the search, changing city, or opening another
              category.
            </p>
          </div>
        ) : null}
      </section>
    </main>
  );
}
