import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { MapPin, MoveRight } from "lucide-react";
import { Button } from "#/components/ui/button";
import { SessionChips } from "#/features/events/components/SessionChips";
import {
  formatDateLabel,
  formatPriceLabel,
  formatTimeLabel,
  getCategoryTheme,
  normalizePublicSessions,
  getPrimarySession,
} from "#/features/events/display";
import { getPublicCategoryBySlug } from "#/lib/api/public";

export const Route = createFileRoute("/categories/$categorySlug")({
  loader: async ({ params }) => {
    try {
      return await getPublicCategoryBySlug(params.categorySlug);
    } catch {
      throw notFound();
    }
  },
  component: CategoryPage,
});

function CategoryPage() {
  const category = Route.useLoaderData();
  const events = category.events ?? [];
  const theme = getCategoryTheme(category.slug);

  return (
    <main className="mx-auto max-w-7xl px-4 pb-10 pt-10 sm:pt-14">
      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm">
        <Link
          to="/"
          className="font-medium text-primary no-underline transition-colors hover:text-primary/80"
        >
          Home
        </Link>
        <span className="text-muted-foreground">/</span>
        <Link
          to="/events"
          className="font-medium text-primary no-underline transition-colors hover:text-primary/80"
        >
          Events
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-muted-foreground">{category.name}</span>
      </div>

      <section className="overflow-hidden rounded-[2rem] border border-border/70 bg-card/85 shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1.35fr)_20rem]">
          <div className="p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Category
            </p>
            <h1 className="mt-3 font-serif text-4xl font-semibold text-foreground sm:text-5xl">
              {category.name}
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-muted-foreground">
              {category.description}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <span className="rounded-full border border-border/70 bg-background/80 px-4 py-2 text-sm font-medium text-foreground">
                {events.length} events
              </span>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {[
                "Focused category browsing",
                "Stronger comparison between similar events",
                "Cleaner path from category to booking",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-[1.2rem] border border-border/60 bg-background/70 px-4 py-3 text-sm text-muted-foreground"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="relative min-h-64">
            <div
              className={`absolute inset-0 bg-linear-to-br ${theme.imageOverlay}`}
              style={{
                backgroundImage: category.image_url
                  ? `url(${category.image_url})`
                  : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              All events
            </p>
            <h2 className="mt-2 font-serif text-3xl font-semibold text-foreground">
              {category.name} listings
            </h2>
          </div>
          <Button
            asChild
            variant="outline"
            className="rounded-full bg-background/80"
          >
            <Link to="/events">View all categories</Link>
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => {
            const eventTheme = getCategoryTheme(event.category_slug);
            const primarySession = getPrimarySession(event);

            return (
              <article
                key={event.id}
                className="overflow-hidden rounded-[1.75rem] border border-border/70 bg-card/85 shadow-sm"
              >
                <div
                  className={`h-36 bg-gradient-to-br ${eventTheme.cardGradient} p-5 text-primary-foreground`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="rounded-full bg-black/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/90 backdrop-blur-sm">
                      {formatPriceLabel(event.price_from, event.currency)}
                    </span>
                    <span className="rounded-full bg-white/16 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/90 backdrop-blur-sm">
                      {event.tickets_left > 0
                        ? `${event.tickets_left} left`
                        : "High demand"}
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {event.organizer_name}
                  </p>
                  <h3 className="mt-2 font-serif text-2xl font-semibold text-foreground">
                    {event.title}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">
                    {event.summary}
                  </p>
                  <div className="mt-5 grid gap-2 text-sm text-muted-foreground">
                    <p>
                      {formatDateLabel(
                        primarySession?.starts_at ??
                          event.next_session_starts_at,
                      )}
                    </p>
                    <p>
                      {formatTimeLabel(
                        primarySession?.starts_at ??
                          event.next_session_starts_at,
                      )}
                    </p>
                    <p className="inline-flex items-center gap-2">
                      <MapPin className="size-4" />
                      {event.venue_name}, {event.city}
                    </p>
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
                        <MoveRight className="size-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
