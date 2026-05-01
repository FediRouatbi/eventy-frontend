import { queryOptions } from "@tanstack/react-query";
import type { components } from "#/lib/api/generated/schema";

import { apiClient, createApiClient } from "./client";
import { unwrapData } from "./response";

export type CheckoutOrderItem = components["schemas"]["CheckoutOrderItem"];

export type CheckoutOrder = components["schemas"]["CheckoutOrder"];

export type CheckoutOrderSummary = components["schemas"]["CheckoutOrderSummary"];

export type StripeCheckoutSessionResponse =
  components["schemas"]["StripeCheckoutSessionResponse"];

export async function createCheckoutOrder(
  input: components["schemas"]["CreateCheckoutOrderInput"],
) {
  return unwrapData(
    await apiClient.POST("/v1/public/checkout-orders", {
      body: input,
    }),
    "Failed to create checkout order",
  );
}

export async function getCheckoutOrder(orderID: string, orderToken: string) {
  return unwrapData(
    await apiClient.GET("/v1/public/checkout-orders/{orderID}", {
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
  return unwrapData(
    await apiClient.POST("/v1/public/checkout-orders/{orderID}/stripe-session", {
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
  return unwrapData(
    await apiClient.GET("/v1/public/stripe-sessions/{stripeSessionID}/checkout-order", {
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
