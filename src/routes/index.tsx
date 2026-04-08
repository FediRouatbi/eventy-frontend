import { createFileRoute } from "@tanstack/react-router";
import { HomeDiscoveryPage } from "#/features/events/components/HomeDiscoveryPage";
import { listCategories, listPublicEvents } from "#/lib/api/public";

export const Route = createFileRoute("/")({
  loader: async () => {
    const [categories, events] = await Promise.all([
      listCategories(),
      listPublicEvents(),
    ]);

    return { categories, events };
  },
  component: HomePage,
});

function HomePage() {
  const { categories, events } = Route.useLoaderData();

  return <HomeDiscoveryPage categories={categories} events={events} />;
}
