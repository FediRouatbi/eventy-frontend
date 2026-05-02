import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/checkout/complete")({
  validateSearch: (search: unknown) => {
    const record =
      search && typeof search === "object"
        ? (search as Record<string, unknown>)
        : {};

    return {
      session_id:
        typeof record.session_id === "string" ? record.session_id : "",
      open_app: typeof record.open_app === "string" ? record.open_app : "",
    };
  },
  beforeLoad: ({ search }) => {
    const sessionId =
      typeof search.session_id === "string" ? search.session_id : "";

    throw redirect({
      to: "/checkout/success",
      search: {
        session_id: sessionId,
        open_app: typeof search.open_app === "string" ? search.open_app : "",
      },
    });
  },
});
