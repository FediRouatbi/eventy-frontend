import type { components } from "./generated/schema";
import { createApiClient } from "./client";
import { unwrapData } from "./response";

export type Ticket = components["schemas"]["Ticket"];

export type CheckInResult = components["schemas"]["CheckInResult"];

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
