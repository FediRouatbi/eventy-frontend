import type { components } from "./generated/schema";
import { createApiClient } from "./client";

export type Ticket = components["schemas"]["Ticket"];

export type CheckInResult = components["schemas"]["CheckInResult"];

type ApiErrorPayload = {
  message?: string;
  error?: string;
};

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

function unwrapData<T>(
  payload: {
    data?: T;
    error?: ApiErrorPayload;
  },
  fallback: string,
) {
  if (payload.error || !payload.data) {
    throw new Error(getErrorMessage(payload.error, fallback));
  }

  return payload.data;
}

export async function listMyTickets(accessToken: string, limit = 50) {
  const client = createApiClient(accessToken);
  return unwrapData(
    await client.GET("/v1/tickets", {
      params: {
        query: {
          limit,
        },
      },
    }),
    "Failed to load tickets",
  );
}

export async function checkInTicket(accessToken: string, code: string) {
  const client = createApiClient(accessToken);
  return unwrapData(
    await client.POST("/v1/tickets/check-in", {
      body: { code },
    }),
    "Failed to check in ticket",
  );
}
