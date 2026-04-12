import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { EventsDirectoryPage } from "#/features/events/components/EventsDirectoryPage";
import {
  categoriesQueryOptions,
  publicEventsQueryOptions,
} from "#/lib/api/public";
import { queryClient } from "#/lib/query-client";

export const Route = createFileRoute("/events/")({
  loader: async () => {
    await Promise.all([
      queryClient.ensureQueryData(categoriesQueryOptions()),
      queryClient.ensureQueryData(publicEventsQueryOptions()),
    ]);
  },
  component: EventsPage,
});

function EventsPage() {
  const { data: categories } = useSuspenseQuery(categoriesQueryOptions());
  const { data: events } = useSuspenseQuery(publicEventsQueryOptions());

  return (
    <EventsDirectoryPage
      categories={categories}
      events={events}
      introLabel="Browse events"
      introTitle="A clearer event directory with strong categories and faster scanning."
      introDescription="This page combines category scanning, compact event cards, and stronger signals like date, venue, and ticket price at a glance."
    />
  );
}
