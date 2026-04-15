import { apiClient, createApiClient } from "#/lib/api/client";
import type { components } from "#/lib/api/generated/schema";

type ApiErrorShape = {
  message?: string;
  error?: string;
};

type Category = components["schemas"]["Category"];
type Organizer = components["schemas"]["Organizer"];
type Event = components["schemas"]["Event"];
type EventDetail = components["schemas"]["EventDetail"];
type EventSession = components["schemas"]["EventSession"];
type TicketType = components["schemas"]["TicketType"];
type OrganizerAdmin = components["schemas"]["OrganizerAdmin"];
type CreateOrganizerAdminInput =
  components["schemas"]["CreateOrganizerAdminInput"];
type CreateOrganizerAdminResult =
  components["schemas"]["CreateOrganizerAdminResult"];
type CreateCategoryInput = components["schemas"]["CreateCategoryInput"];
type CreateEventInput = components["schemas"]["CreateEventInput"];
type CreateEventSessionInput = components["schemas"]["CreateEventSessionInput"];
type UpdateEventSessionInput = components["schemas"]["UpdateEventSessionInput"];
type CreateTicketTypeInput = components["schemas"]["CreateTicketTypeInput"];
type UpdateTicketTypeInput = components["schemas"]["UpdateTicketTypeInput"];

type OrganizerSummary = {
  id: string;
  name: string;
  slug: string;
  admin_count: number;
  event_count: number;
  session_count: number;
  created_at: string;
  updated_at: string;
};

type OrganizerListItem = OrganizerSummary & {
  admin: OrganizerAdmin | null;
};

type OrganizerManagedEvent = {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published" | "cancelled";
  currency: string;
  city: string;
  country: string;
  session_count: number;
  ticket_type_count: number;
  next_session_starts_at?: string;
  created_at: string;
  updated_at: string;
};

type OrganizerDetail = {
  organizer: OrganizerListItem;
  events: OrganizerManagedEvent[] | null;
};

type UpdateOrganizerInput = {
  organizer_name: string;
  organizer_slug: string;
};

type UpdateOrganizerAdminInput = {
  admin_name: string;
  admin_email: string;
};

type UpdateCategoryInput = {
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
};

export type UpdateAdminEventInput = {
  category_id: string;
  title: string;
  slug: string;
  description: string;
  venue_name: string;
  venue_address: string;
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
  banner_url?: string;
  poster_url?: string;
  status: "draft" | "published" | "cancelled";
  currency: string;
  is_featured: boolean;
};

export type AdminEventListItem = {
  id: string;
  organizer_id: string;
  organizer_name: string;
  organizer_slug: string;
  category_id: string;
  category_name: string;
  category_slug: string;
  title: string;
  slug: string;
  description: string;
  venue_name: string;
  venue_address: string;
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
  banner_url?: string;
  poster_url?: string;
  status: "draft" | "published" | "cancelled";
  currency: string;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  session_count: number;
  ticket_type_count: number;
  next_session_starts_at?: string;
  has_sessions_without_tickets: boolean;
};

export type AdminOverview = {
  scope: "super_admin" | "organizer_admin";
  stats: {
    events: number;
    published_events: number;
    draft_events: number;
    sessions: number;
    scheduled_sessions: number;
    ticket_types: number;
    categories: number;
    organizers: number;
  };
  needs_attention: {
    draft_events_count: number;
    events_without_sessions_count: number;
    sessions_without_ticket_types_count: number;
    events_without_sessions: Array<{
      id: string;
      title: string;
      slug: string;
      created_at: string;
    }>;
    sessions_without_ticket_types: Array<{
      id: string;
      event_id: string;
      event_title: string;
      starts_at: string;
      status: "scheduled" | "completed" | "cancelled";
    }>;
  };
  recent_events: Array<{
    id: string;
    organizer_id: string;
    category_id: string;
    title: string;
    slug: string;
    status: "draft" | "published" | "cancelled";
    venue_name: string;
    city: string;
    country: string;
    organizer_name: string;
    category_name: string;
    created_at: string;
    updated_at: string;
  }>;
  upcoming_sessions: Array<{
    id: string;
    event_id: string;
    event_title: string;
    event_slug: string;
    event_currency: string;
    status: "scheduled" | "completed" | "cancelled";
    starts_at: string;
    ticket_type_count: number;
  }>;
  organizers: Array<{
    id: string;
    name: string;
    slug: string;
    event_count: number;
    session_count: number;
  }>;
};

export type AdminPaymentsResponse = components["schemas"]["AdminPayments"];
export type AdminPaymentItem = components["schemas"]["AdminPaymentItem"];
export type AdminPaymentTrendPoint = components["schemas"]["AdminPaymentTrend"];
export type AdminPaymentStatus = AdminPaymentItem["status"];

function normalizeAdminOverview(overview: AdminOverview): AdminOverview {
  return {
    ...overview,
    needs_attention: {
      ...overview.needs_attention,
      events_without_sessions:
        overview.needs_attention.events_without_sessions ?? [],
      sessions_without_ticket_types:
        overview.needs_attention.sessions_without_ticket_types ?? [],
    },
    recent_events: overview.recent_events ?? [],
    upcoming_sessions: overview.upcoming_sessions ?? [],
    organizers: overview.organizers ?? [],
  };
}

function getErrorMessage(payload: unknown, fallback: string) {
  if (
    payload &&
    typeof payload === "object" &&
    "message" in payload &&
    typeof (payload as { message?: unknown }).message === "string"
  ) {
    return (payload as { message: string }).message;
  }

  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof (payload as { error?: unknown }).error === "string"
  ) {
    return (payload as { error: string }).error;
  }

  return fallback;
}

function getClient(accessToken?: string) {
  return accessToken ? createApiClient(accessToken) : apiClient;
}

function unwrapData<T>(
  payload: {
    data?: T;
    error?: ApiErrorShape;
  },
  fallback: string,
) {
  if (payload.error || !payload.data) {
    throw new Error(getErrorMessage(payload.error, fallback));
  }

  return payload.data;
}

function assertSuccess(
  payload: {
    error?: ApiErrorShape;
  },
  fallback: string,
) {
  if (payload.error) {
    throw new Error(getErrorMessage(payload.error, fallback));
  }
}

export async function listAdminCategories(accessToken: string) {
  const client = getClient(accessToken);
  return unwrapData(await client.GET("/v1/categories"), "Failed to load categories");
}

export async function createCategory(
  accessToken: string,
  input: CreateCategoryInput,
) {
  const client = getClient(accessToken);
  return unwrapData(
    await client.POST("/v1/categories", {
      body: input,
    }),
    "Failed to create category",
  );
}

export async function updateCategory(
  accessToken: string,
  categoryId: string,
  input: UpdateCategoryInput,
) {
  const client = getClient(accessToken);
  return unwrapData(
    await client.PATCH("/v1/categories/{categoryID}", {
      params: {
        path: {
          categoryID: categoryId,
        },
      },
      body: input,
    }),
    "Failed to update category",
  );
}

export async function deleteCategory(accessToken: string, categoryId: string) {
  const client = getClient(accessToken);
  assertSuccess(
    await client.DELETE("/v1/categories/{categoryID}", {
      params: {
        path: {
          categoryID: categoryId,
        },
      },
    }),
    "Failed to delete category",
  );
}

export async function getAdminOverview(accessToken: string) {
  const client = getClient(accessToken) as {
    GET: (
      path: "/v1/admins/overview",
    ) => Promise<{ data?: AdminOverview; error?: ApiErrorShape }>;
  };

  return normalizeAdminOverview(
    unwrapData(await client.GET("/v1/admins/overview"), "Failed to load overview"),
  );
}

export async function getAdminPayments(
  accessToken: string,
  options?: { limit?: number },
) {
  const client = getClient(accessToken);
  return unwrapData(
    await client.GET("/v1/admins/payments", {
      params: {
        query: {
          limit: options?.limit ?? 20,
        },
      },
    }),
    "Failed to load payments",
  );
}

export async function listAdminEvents(accessToken: string) {
  const client = getClient(accessToken) as {
    GET: (
      path: "/v1/events",
    ) => Promise<{ data?: AdminEventListItem[]; error?: ApiErrorShape }>;
  };

  return unwrapData(await client.GET("/v1/events"), "Failed to load events");
}

export async function createEvent(
  accessToken: string,
  input: CreateEventInput,
) {
  const client = getClient(accessToken);
  return unwrapData(
    await client.POST("/v1/events", {
      body: input,
    }),
    "Failed to create event",
  );
}

export async function listAdminOrganizers(accessToken: string) {
  const client = getClient(accessToken) as {
    GET: (
      path: "/v1/admins/organizers",
    ) => Promise<{ data?: OrganizerListItem[]; error?: ApiErrorShape }>;
  };

  return unwrapData(
    await client.GET("/v1/admins/organizers"),
    "Failed to load organizers",
  );
}

export async function createOrganizerAdmin(
  accessToken: string,
  input: CreateOrganizerAdminInput,
) {
  const client = getClient(accessToken);
  return unwrapData(
    await client.POST("/v1/admins/organizers", {
      body: input,
    }),
    "Failed to create organizer admin",
  );
}

export async function getAdminOrganizer(
  accessToken: string,
  organizerId: string,
) {
  const client = getClient(accessToken) as {
    GET: (
      path: "/v1/admins/organizers/{organizerID}",
      init: {
        params: {
          path: {
            organizerID: string;
          };
        };
      },
    ) => Promise<{ data?: OrganizerDetail; error?: ApiErrorShape }>;
  };

  return unwrapData(
    await client.GET("/v1/admins/organizers/{organizerID}", {
      params: {
        path: {
          organizerID: organizerId,
        },
      },
    }),
    "Failed to load organizer",
  );
}

export async function updateOrganizer(
  accessToken: string,
  organizerId: string,
  input: UpdateOrganizerInput,
) {
  const client = getClient(accessToken) as {
    PATCH: (
      path: "/v1/admins/organizers/{organizerID}",
      init: {
        params: {
          path: {
            organizerID: string;
          };
        };
        body: UpdateOrganizerInput;
      },
    ) => Promise<{ data?: Organizer; error?: ApiErrorShape }>;
  };

  return unwrapData(
    await client.PATCH("/v1/admins/organizers/{organizerID}", {
      params: {
        path: {
          organizerID: organizerId,
        },
      },
      body: input,
    }),
    "Failed to update organizer",
  );
}

export async function getOrganizerAdmin(
  accessToken: string,
  organizerId: string,
) {
  const client = getClient(accessToken);
  return unwrapData(
    await client.GET("/v1/admins/organizers/{organizerID}/admin", {
      params: {
        path: {
          organizerID: organizerId,
        },
      },
    }),
    "Failed to load organizer admin",
  );
}

export async function updateOrganizerAdmin(
  accessToken: string,
  organizerId: string,
  input: UpdateOrganizerAdminInput,
) {
  const client = getClient(accessToken) as {
    PATCH: (
      path: "/v1/admins/organizers/{organizerID}/admin",
      init: {
        params: {
          path: {
            organizerID: string;
          };
        };
        body: UpdateOrganizerAdminInput;
      },
    ) => Promise<{ data?: OrganizerAdmin; error?: ApiErrorShape }>;
  };

  return unwrapData(
    await client.PATCH("/v1/admins/organizers/{organizerID}/admin", {
      params: {
        path: {
          organizerID: organizerId,
        },
      },
      body: input,
    }),
    "Failed to update organizer admin",
  );
}

export async function deleteOrganizerAdmin(
  accessToken: string,
  organizerId: string,
) {
  const client = getClient(accessToken);
  assertSuccess(
    await client.DELETE("/v1/admins/organizers/{organizerID}/admin", {
      params: {
        path: {
          organizerID: organizerId,
        },
      },
    }),
    "Failed to delete organizer admin",
  );
}

export async function deleteOrganizer(
  accessToken: string,
  organizerId: string,
) {
  const client = getClient(accessToken);
  assertSuccess(
    await client.DELETE("/v1/admins/organizers/{organizerID}", {
      params: {
        path: {
          organizerID: organizerId,
        },
      },
    }),
    "Failed to delete organizer",
  );
}

export async function getAdminEventById(accessToken: string, eventId: string) {
  const client = getClient(accessToken);
  return unwrapData(
    await client.GET("/v1/events/{eventID}", {
      params: {
        path: {
          eventID: eventId,
        },
      },
    }),
    "Failed to load event",
  );
}

export async function updateAdminEvent(
  accessToken: string,
  eventId: string,
  input: UpdateAdminEventInput,
) {
  const client = getClient(accessToken);
  return unwrapData(
    await client.PATCH("/v1/events/{eventID}", {
      params: {
        path: {
          eventID: eventId,
        },
      },
      body: input,
    }),
    "Failed to update event",
  );
}

export async function deleteAdminEvent(accessToken: string, eventId: string) {
  const client = getClient(accessToken);
  assertSuccess(
    await client.DELETE("/v1/events/{eventID}", {
      params: {
        path: {
          eventID: eventId,
        },
      },
    }),
    "Failed to delete event",
  );
}

export async function createEventSession(
  accessToken: string,
  eventId: string,
  input: CreateEventSessionInput,
) {
  const client = getClient(accessToken);
  return unwrapData(
    await client.POST("/v1/events/{eventID}/sessions", {
      params: {
        path: {
          eventID: eventId,
        },
      },
      body: input,
    }),
    "Failed to create session",
  );
}

export async function updateEventSession(
  accessToken: string,
  eventId: string,
  sessionId: string,
  input: UpdateEventSessionInput,
) {
  const client = getClient(accessToken);
  return unwrapData(
    await client.PATCH("/v1/events/{eventID}/sessions/{sessionID}", {
      params: {
        path: {
          eventID: eventId,
          sessionID: sessionId,
        },
      },
      body: input,
    }),
    "Failed to update session",
  );
}

export async function deleteEventSession(
  accessToken: string,
  eventId: string,
  sessionId: string,
) {
  const client = getClient(accessToken);
  assertSuccess(
    await client.DELETE("/v1/events/{eventID}/sessions/{sessionID}", {
      params: {
        path: {
          eventID: eventId,
          sessionID: sessionId,
        },
      },
    }),
    "Failed to delete session",
  );
}

export async function createTicketType(
  accessToken: string,
  eventId: string,
  sessionId: string,
  input: CreateTicketTypeInput,
) {
  const client = getClient(accessToken);
  return unwrapData(
    await client.POST(
      "/v1/events/{eventID}/sessions/{sessionID}/ticket-types",
      {
        params: {
          path: {
            eventID: eventId,
            sessionID: sessionId,
          },
        },
        body: input,
      },
    ),
    "Failed to create ticket type",
  );
}

export async function updateTicketType(
  accessToken: string,
  eventId: string,
  sessionId: string,
  ticketTypeId: string,
  input: UpdateTicketTypeInput,
) {
  const client = getClient(accessToken);
  return unwrapData(
    await client.PATCH(
      "/v1/events/{eventID}/sessions/{sessionID}/ticket-types/{ticketTypeID}",
      {
        params: {
          path: {
            eventID: eventId,
            sessionID: sessionId,
            ticketTypeID: ticketTypeId,
          },
        },
        body: input,
      },
    ),
    "Failed to update ticket type",
  );
}

export async function deleteAdminTicketType(
  accessToken: string,
  eventId: string,
  sessionId: string,
  ticketTypeId: string,
) {
  const client = getClient(accessToken);
  assertSuccess(
    await client.DELETE(
      "/v1/events/{eventID}/sessions/{sessionID}/ticket-types/{ticketTypeID}",
      {
        params: {
          path: {
            eventID: eventId,
            sessionID: sessionId,
            ticketTypeID: ticketTypeId,
          },
        },
      },
    ),
    "Failed to delete ticket type",
  );
}
