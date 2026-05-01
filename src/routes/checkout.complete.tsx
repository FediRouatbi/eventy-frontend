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
    };
  },
  beforeLoad: ({ search, location }) => {
    const sessionId =
      typeof search?.session_id === "string"
        ? search.session_id
        : typeof (location.search as Record<string, unknown> | undefined)
              ?.session_id === "string"
          ? String(
              (location.search as Record<string, unknown> | undefined)
                ?.session_id,
            )
          : "";

    throw redirect({
      to: "/checkout/success",
      search: {
        session_id: sessionId,
      },
    });
  },
});
