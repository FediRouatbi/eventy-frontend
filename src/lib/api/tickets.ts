import { API_BASE_URL } from "./client";

export type Ticket = {
  id: string;
  code: string;
  order_id: string;
  order_number: string;
  order_status: string;
  customer_name: string;
  customer_email: string;
  ticket_type_id: string;
  ticket_type_name: string;
  event_id: string;
  event_title: string;
  session_id: string;
  session_starts_at: string;
  session_ends_at: string;
  paid_at?: string | null;
  checked_in_at?: string | null;
  checked_in_by_user_id?: string | null;
  created_at: string;
  updated_at: string;
};

export type CheckInResult = {
  ticket: Ticket;
  already_checked: boolean;
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

export async function listMyTickets(accessToken: string, limit = 50) {
  const response = await fetch(
    `${API_BASE_URL}/v1/tickets?limit=${encodeURIComponent(String(limit))}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  return parseApiResponse<Ticket[]>(response, "Failed to load tickets");
}

export async function checkInTicket(accessToken: string, code: string) {
  const response = await fetch(`${API_BASE_URL}/v1/tickets/check-in`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ code }),
  });

  return parseApiResponse<CheckInResult>(response, "Failed to check in ticket");
}

