import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Refetch whenever a route/query mounts (i.e. on every navigation) so
      // each tab shows fresh data instead of a stale cache.
      refetchOnMount: "always",
      refetchOnWindowFocus: false,
    },
  },
});
