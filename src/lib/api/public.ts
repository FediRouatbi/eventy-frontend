import { queryOptions } from "@tanstack/react-query";

import { API_BASE_URL, apiClient } from "./client";
import type { components } from "./generated/schema";

export type ApiCategory = components["schemas"]["Category"];
export type ApiEvent = components["schemas"]["Event"];
export type ApiPublicEvent = components["schemas"]["PublicEvent"];
export type ApiPublicEventDetail = components["schemas"]["PublicEventDetail"];
type ApiSession = NonNullable<ApiPublicEventDetail["sessions"]>[number];
type ApiTicketType = NonNullable<ApiSession["ticket_types"]>[number];
export type ApiPublicEventWithSessions = ApiPublicEvent & {
  sessions?: ApiPublicEventDetail["sessions"] | null;
};
export type ApiPublicSession = Omit<ApiSession, "ticket_types"> & {
  ticket_types: ApiTicketType[];
};
export type ApiPublicCategoryDetail = ApiCategory & {
  events: Array<
    ApiPublicEventWithSessions & {
      sessions: ApiPublicSession[];
    }
  >;
};

function normalizeSession(session: ApiSession): ApiPublicSession {
  return {
    ...session,
    ticket_types: session.ticket_types ?? [],
  };
}

function normalizePublicEvent(
  event: ApiPublicEventWithSessions,
): ApiPublicEventWithSessions {
  return {
    ...event,
    sessions: (event.sessions ?? []).map(normalizeSession),
  };
}

export async function listCategories() {
  const { data, error } = await apiClient.GET("/v1/categories");

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to load categories");
  }

  return data ?? [];
}

export async function listEvents() {
  const { data, error, response } = await apiClient.GET("/v1/events");

  if (response.status === 401 || response.status === 403) {
    return null;
  }

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to load events");
  }

  return data;
}

export async function listPublicEvents() {
  const { data, error } = await apiClient.GET("/v1/public/events");

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to load public events");
  }

  return ((data as ApiPublicEventWithSessions[] | null) ?? []).map(
    normalizePublicEvent,
  );
}

export async function getPublicEventById(eventID: string) {
  const { data, error } = await apiClient.GET("/v1/public/events/{eventID}", {
    params: {
      path: {
        eventID,
      },
    },
  });

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to load public event");
  }

  return normalizePublicEvent(data as ApiPublicEventWithSessions);
}

export async function getPublicCategoryBySlug(categorySlug: string) {
  const response = await fetch(
    `${API_BASE_URL}/v1/public/categories/${encodeURIComponent(categorySlug)}`,
  );

  if (!response.ok) {
    throw new Error("Failed to load public category");
  }

  const payload = (await response.json()) as ApiPublicCategoryDetail;

  return {
    ...payload,
    events: (payload.events ?? []).map((event) => ({
      ...normalizePublicEvent(event),
      sessions: event.sessions ?? [],
    })),
  };
}

export function publicEventsQueryOptions() {
  return queryOptions({
    queryKey: ["public", "events"],
    queryFn: listPublicEvents,
  });
}

export function publicEventDetailQueryOptions(eventID: string) {
  return queryOptions({
    queryKey: ["public", "events", eventID],
    queryFn: () => getPublicEventById(eventID),
  });
}

export function publicCategoryDetailQueryOptions(categorySlug: string) {
  return queryOptions({
    queryKey: ["public", "categories", categorySlug],
    queryFn: () => getPublicCategoryBySlug(categorySlug),
  });
}
