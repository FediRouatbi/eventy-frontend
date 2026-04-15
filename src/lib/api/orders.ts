import { queryOptions } from "@tanstack/react-query";
import type { components } from "#/lib/api/generated/schema";

import { apiClient, createApiClient } from "./client";

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

export type CheckoutOrderSummary = components["schemas"]["CheckoutOrderSummary"];

export type StripeCheckoutSessionResponse = {
  session_id: string;
  checkout_url: string;
  order_id: string;
  order_number: string;
  expires_at: string;
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

export async function createCheckoutOrder(input: {
  reservation_id: string;
  reservation_token: string;
  customer_name: string;
  customer_email: string;
}) {
  const client = apiClient as {
    POST: (
      path: "/v1/public/checkout-orders",
      init?: { body: typeof input },
    ) => Promise<{ data?: CheckoutOrder; error?: ApiErrorPayload }>;
  };

  return unwrapData(
    await client.POST("/v1/public/checkout-orders", {
      body: input,
    }),
    "Failed to create checkout order",
  );
}

export async function getCheckoutOrder(orderID: string, orderToken: string) {
  const client = apiClient as {
    GET: (
      path: "/v1/public/checkout-orders/{orderID}",
      init?: {
        params: {
          path: { orderID: string };
          query: { token: string };
        };
      },
    ) => Promise<{ data?: CheckoutOrder; error?: ApiErrorPayload }>;
  };

  return unwrapData(
    await client.GET("/v1/public/checkout-orders/{orderID}", {
      params: {
        path: {
          orderID,
        },
        query: {
          token: orderToken,
        },
      },
    }),
    "Failed to load checkout order",
  );
}

export async function createStripeCheckoutSession(orderID: string, orderToken: string) {
  const client = apiClient as {
    POST: (
      path: "/v1/public/checkout-orders/{orderID}/stripe-session",
      init?: {
        params: { path: { orderID: string } };
        body: { order_token: string };
      },
    ) => Promise<{ data?: StripeCheckoutSessionResponse; error?: ApiErrorPayload }>;
  };

  return unwrapData(
    await client.POST("/v1/public/checkout-orders/{orderID}/stripe-session", {
      params: {
        path: {
          orderID,
        },
      },
      body: {
        order_token: orderToken,
      },
    }),
    "Failed to create payment session",
  );
}

export async function getCheckoutOrderByStripeSession(stripeSessionID: string) {
  const client = apiClient as {
    GET: (
      path: "/v1/public/stripe-sessions/{stripeSessionID}/checkout-order",
      init?: { params: { path: { stripeSessionID: string } } },
    ) => Promise<{ data?: CheckoutOrderSummary; error?: ApiErrorPayload }>;
  };

  return unwrapData(
    await client.GET("/v1/public/stripe-sessions/{stripeSessionID}/checkout-order", {
      params: {
        path: {
          stripeSessionID,
        },
      },
    }),
    "Failed to load order payment status",
  );
}

export async function getMyCheckoutOrderByStripeSession(
  stripeSessionID: string,
  accessToken: string,
) {
  const client = createApiClient(accessToken);
  const payload = await client.GET(
    "/v1/orders/stripe-sessions/{stripeSessionID}/checkout-order",
    {
      params: {
        path: {
          stripeSessionID,
        },
      },
    },
  );

  if (payload.response.status === 404) {
    return null;
  }

  return unwrapData(payload, "Failed to load order payment status");
}

export async function listMyCheckoutOrders(accessToken: string, limit = 20) {
  const client = createApiClient(accessToken);
  return unwrapData(
    await client.GET("/v1/orders", {
      params: {
        query: {
          limit,
        },
      },
    }),
    "Failed to load orders",
  );
}

export async function getMyCheckoutOrderById(orderId: string, accessToken: string) {
  const client = createApiClient(accessToken);
  return unwrapData(
    await client.GET("/v1/orders/{orderID}", {
      params: {
        path: {
          orderID: orderId,
        },
      },
    }),
    "Failed to load order",
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
