import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { HomeDiscoveryPage } from "#/features/events/components/HomeDiscoveryPage";
import {
  categoriesQueryOptions,
  publicEventsQueryOptions,
} from "#/lib/api/public";
import { queryClient } from "#/lib/query-client";

export const Route = createFileRoute("/")({
  loader: async () => {
    await Promise.all([
      queryClient.ensureQueryData(categoriesQueryOptions()),
      queryClient.ensureQueryData(publicEventsQueryOptions()),
    ]);
  },
  component: HomePage,
});

function HomePage() {
  const { data: categories } = useSuspenseQuery(categoriesQueryOptions());
  const { data: events } = useSuspenseQuery(publicEventsQueryOptions());

  return <HomeDiscoveryPage categories={categories} events={events} />;
}
