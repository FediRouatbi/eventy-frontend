import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/complete")({
  validateSearch: (search: Record<string, unknown>) => ({
    session_id: typeof search.session_id === "string" ? search.session_id : "",
  }),
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/checkout/success",
      search: {
        session_id: search.session_id,
      },
    });
  },
});
