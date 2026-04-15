import { apiClient } from "./client";

export type ReservationItemPayload = {
  ticket_type_id: string;
  ticket_type_name: string;
  quantity: number;
  unit_price: number;
  currency: string;
  max_per_order: number;
  available_quantity: number;
  event_id: string;
  event_title: string;
  session_id: string;
  session_starts_at: string;
  session_ends_at?: string | null;
};

export type ReservationPayload = {
  id: string;
  token: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
  items: ReservationItemPayload[];
};

export type UpsertReservationInput = {
  reservation_id?: string;
  reservation_token?: string;
  items: Array<{
    ticket_type_id: string;
    quantity: number;
  }>;
};

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

export async function upsertReservation(input: UpsertReservationInput) {
  const client = apiClient as {
    POST: (
      path: "/v1/public/reservations",
      init?: { body: UpsertReservationInput },
    ) => Promise<{ data?: ReservationPayload; error?: ApiErrorPayload }>;
  };

  return unwrapData(
    await client.POST("/v1/public/reservations", {
      body: input,
    }),
    "Failed to update reservation",
  );
}

export async function getReservation(
  reservationID: string,
  reservationToken: string,
) {
  const client = apiClient as {
    GET: (
      path: "/v1/public/reservations/{reservationID}",
      init?: {
        params: {
          path: { reservationID: string };
          query: { token: string };
        };
      },
    ) => Promise<{ data?: ReservationPayload; error?: ApiErrorPayload }>;
  };

  return unwrapData(
    await client.GET("/v1/public/reservations/{reservationID}", {
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
  const client = apiClient as {
    DELETE: (
      path: "/v1/public/reservations/{reservationID}",
      init?: {
        params: {
          path: { reservationID: string };
          query: { token: string };
        };
      },
    ) => Promise<{ error?: ApiErrorPayload; response: Response }>;
  };

  const payload = await client.DELETE("/v1/public/reservations/{reservationID}", {
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
    throw new Error(getErrorMessage(payload.error, "Failed to clear reservation"));
  }
}
