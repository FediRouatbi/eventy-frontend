import { createFileRoute } from "@tanstack/react-router";
import { EventsDirectoryPage } from "#/features/events/components/EventsDirectoryPage";
import { listCategories, listPublicEvents } from "#/lib/api/public";

export const Route = createFileRoute("/events/")({
  loader: async () => {
    const [categories, events] = await Promise.all([
      listCategories(),
      listPublicEvents(),
    ]);

    return { categories, events };
  },
  component: EventsPage,
});

function EventsPage() {
  const { categories, events } = Route.useLoaderData();

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
