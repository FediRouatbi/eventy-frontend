import { API_BASE_URL } from "./client";

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
};

async function parseApiResponse<T>(response: Response, fallbackMessage: string) {
  const payload = (await response.json().catch(() => null)) as
    | T
    | ApiErrorPayload
    | null;

  if (!response.ok) {
    throw new Error(
      (payload as ApiErrorPayload | null)?.message ?? fallbackMessage,
    );
  }

  if (!payload) {
    throw new Error(fallbackMessage);
  }

  return payload as T;
}

export async function upsertReservation(input: UpsertReservationInput) {
  const response = await fetch(`${API_BASE_URL}/v1/public/reservations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return parseApiResponse<ReservationPayload>(
    response,
    "Failed to update reservation",
  );
}

export async function getReservation(
  reservationID: string,
  reservationToken: string,
) {
  const response = await fetch(
    `${API_BASE_URL}/v1/public/reservations/${reservationID}?token=${encodeURIComponent(reservationToken)}`,
  );

  return parseApiResponse<ReservationPayload>(
    response,
    "Failed to load reservation",
  );
}

export async function deleteReservation(
  reservationID: string,
  reservationToken: string,
) {
  const response = await fetch(
    `${API_BASE_URL}/v1/public/reservations/${reservationID}?token=${encodeURIComponent(reservationToken)}`,
    {
      method: "DELETE",
    },
  );

  if (!response.ok && response.status !== 404) {
    const payload = (await response.json().catch(() => null)) as
      | ApiErrorPayload
      | null;
    throw new Error(payload?.message ?? "Failed to clear reservation");
  }
}
