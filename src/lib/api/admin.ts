import { apiClient, createApiClient } from "#/lib/api/client";
import type { components } from "#/lib/api/generated/schema";
import { assertSuccess, getApiErrorMessage, unwrapData } from "./response";

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
type OrganizerListItem = components["schemas"]["OrganizerListItem"];
type OrganizerDetail = components["schemas"]["OrganizerDetail"];
type UpdateOrganizerInput = components["schemas"]["UpdateOrganizerInput"];
type UpdateOrganizerAdminInput = components["schemas"]["UpdateOrganizerAdminInput"];
type UpdateCategoryInput = components["schemas"]["UpdateCategoryInput"];

export type UpdateAdminEventInput = components["schemas"]["UpdateEventInput"];
export type AdminEventListItem = components["schemas"]["Event"];
export type AdminOverview = components["schemas"]["AdminOverview"];

export type AdminPaymentsResponse = components["schemas"]["AdminPayments"];
export type AdminPaymentItem = components["schemas"]["AdminPaymentItem"];
export type AdminPaymentTrendPoint = components["schemas"]["AdminPaymentTrend"];
export type AdminPaymentStatus = AdminPaymentItem["status"];
export type AdminPaymentsExportOptions = {
  from: string;
  to: string;
  organizer_id?: string;
  timezone?: string;
};

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

function getClient(accessToken?: string) {
  return accessToken ? createApiClient(accessToken) : apiClient;
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
  const client = getClient(accessToken);

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

function getFileNameFromContentDisposition(headerValue: string | null) {
  if (!headerValue) {
    return "finance-export.csv";
  }

  const utf8Match = headerValue.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const plainMatch = headerValue.match(/filename=\"?([^\";]+)\"?/i);
  if (plainMatch?.[1]) {
    return plainMatch[1];
  }

  return "finance-export.csv";
}

export async function exportAdminPaymentsCsv(
  accessToken: string,
  options: AdminPaymentsExportOptions,
) {
  const client = getClient(accessToken);
  const payload = await client.GET("/v1/admins/payments/export", {
    params: {
      query: {
        from: options.from,
        to: options.to,
        organizer_id: options.organizer_id,
        timezone: options.timezone,
      },
    },
    parseAs: "blob",
  });

  if (payload.error || !payload.data) {
    throw new Error(getApiErrorMessage(payload.error, "Failed to export payments CSV"));
  }

  return {
    blob: payload.data,
    filename: getFileNameFromContentDisposition(
      payload.response.headers.get("Content-Disposition"),
    ),
  };
}

export async function listAdminEvents(accessToken: string) {
  const client = getClient(accessToken);

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
  const client = getClient(accessToken);

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
  const client = getClient(accessToken);

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
  const client = getClient(accessToken);

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

export async function updateOrganizerAdmin(
  accessToken: string,
  organizerId: string,
  adminId: string,
  input: UpdateOrganizerAdminInput,
) {
  const client = getClient(accessToken);

  return unwrapData(
    await client.PATCH("/v1/admins/organizers/{organizerID}/admins/{adminID}", {
      params: {
        path: {
          organizerID: organizerId,
          adminID: adminId,
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
  adminId: string,
) {
  const client = getClient(accessToken);
  assertSuccess(
    await client.DELETE("/v1/admins/organizers/{organizerID}/admins/{adminID}", {
      params: {
        path: {
          organizerID: organizerId,
          adminID: adminId,
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
