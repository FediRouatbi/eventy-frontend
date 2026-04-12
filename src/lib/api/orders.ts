import { queryOptions } from "@tanstack/react-query";

import { API_BASE_URL } from "./client";

export type CheckoutOrderItem = {
  ticket_type_id: string;
  ticket_type_name: string;
  quantity: number;
  unit_price: number;
  currency: string;
  event_id: string;
  event_title: string;
  session_id: string;
  session_starts_at: string;
  session_ends_at?: string | null;
};

export type CheckoutOrder = {
  id: string;
  token: string;
  reservation_id: string;
  order_number: string;
  status: string;
  customer_name: string;
  customer_email: string;
  currency: string;
  subtotal: number;
  expires_at: string;
  created_at: string;
  updated_at: string;
  stripe_checkout_session_id?: string;
  paid_at?: string | null;
  items: CheckoutOrderItem[];
};

export type CheckoutOrderSummary = {
  id: string;
  order_number: string;
  status: string;
  customer_name: string;
  customer_email: string;
  currency: string;
  subtotal: number;
  expires_at: string;
  created_at: string;
  updated_at: string;
  stripe_checkout_session_id?: string;
  paid_at?: string | null;
  items: CheckoutOrderItem[];
};

export type StripeCheckoutSessionResponse = {
  session_id: string;
  checkout_url: string;
  order_id: string;
  order_number: string;
  expires_at: string;
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

export async function createCheckoutOrder(input: {
  reservation_id: string;
  reservation_token: string;
  customer_name: string;
  customer_email: string;
}) {
  const response = await fetch(`${API_BASE_URL}/v1/public/checkout-orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return parseApiResponse<CheckoutOrder>(
    response,
    "Failed to create checkout order",
  );
}

export async function getCheckoutOrder(orderID: string, orderToken: string) {
  const response = await fetch(
    `${API_BASE_URL}/v1/public/checkout-orders/${orderID}?token=${encodeURIComponent(orderToken)}`,
  );

  return parseApiResponse<CheckoutOrder>(
    response,
    "Failed to load checkout order",
  );
}

export async function createStripeCheckoutSession(orderID: string, orderToken: string) {
  const response = await fetch(
    `${API_BASE_URL}/v1/public/checkout-orders/${orderID}/stripe-session`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ order_token: orderToken }),
    },
  );

  return parseApiResponse<StripeCheckoutSessionResponse>(
    response,
    "Failed to create payment session",
  );
}

export async function getCheckoutOrderByStripeSession(stripeSessionID: string) {
  const response = await fetch(
    `${API_BASE_URL}/v1/public/stripe-sessions/${encodeURIComponent(stripeSessionID)}/checkout-order`,
  );

  return parseApiResponse<CheckoutOrderSummary>(
    response,
    "Failed to load order payment status",
  );
}

export function checkoutOrderByStripeSessionQueryOptions(stripeSessionID: string) {
  return queryOptions({
    queryKey: ["public", "stripe-sessions", stripeSessionID, "checkout-order"],
    queryFn: () => getCheckoutOrderByStripeSession(stripeSessionID),
  });
}

export function checkoutOrderQueryOptions(orderID: string, orderToken: string) {
  return queryOptions({
    queryKey: ["public", "checkout-orders", orderID, orderToken],
    queryFn: () => getCheckoutOrder(orderID, orderToken),
  });
}
