import type { components } from "#/lib/api/generated/schema";

import { apiClient } from "./client";
import { getApiErrorMessage, unwrapData } from "./response";

export type ReservationItemPayload = components["schemas"]["TicketReservationItem"];
export type ReservationPayload = components["schemas"]["TicketReservation"];
export type UpsertReservationInput =
  components["schemas"]["UpsertTicketReservationInput"];

export async function upsertReservation(input: UpsertReservationInput) {
  return unwrapData(
    await apiClient.POST("/v1/public/reservations", {
      body: input,
    }),
    "Failed to update reservation",
  );
}

export async function getReservation(
  reservationID: string,
  reservationToken: string,
) {
  return unwrapData(
    await apiClient.GET("/v1/public/reservations/{reservationID}", {
      params: {
        path: {
          reservationID,
        },
        query: {
          token: reservationToken,
        },
      },
    }),
    "Failed to load reservation",
  );
}

export async function deleteReservation(
  reservationID: string,
  reservationToken: string,
) {
  const payload = await apiClient.DELETE("/v1/public/reservations/{reservationID}", {
    params: {
      path: {
        reservationID,
      },
      query: {
        token: reservationToken,
      },
    },
  });

  if (payload.error && payload.response.status !== 404) {
    throw new Error(getApiErrorMessage(payload.error, "Failed to clear reservation"));
  }
}
