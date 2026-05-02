import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";

import { Button } from "#/components/ui/button";
import {
  formatDateRangeLabel,
  formatPriceLabel,
  formatTimeRangeLabel,
} from "#/features/events/display";
import {
  checkoutOrderByStripeSessionQueryOptions,
  checkoutOrderQueryOptions,
  createStripeCheckoutSession,
  getCheckoutOrderByStripeSession,
  getCheckoutOrder,
} from "#/lib/api/orders";
import { clearCart } from "#/lib/cart";
import { queryClient } from "#/lib/query-client";

export const Route = createFileRoute("/checkout/success")({
  validateSearch: normalizeCheckoutSuccessSearch,
  loader: async ({ search }) => {
    const parsedSearch = normalizeCheckoutSuccessSearch(search);

    if (parsedSearch.session_id) {
      try {
        await queryClient.ensureQueryData(
          checkoutOrderByStripeSessionQueryOptions(parsedSearch.session_id),
        );
      } catch {
        return;
      }

      return;
    }

    if (!parsedSearch.orderId || !parsedSearch.token) {
      return;
    }

    try {
      await queryClient.ensureQueryData(
        checkoutOrderQueryOptions(parsedSearch.orderId, parsedSearch.token),
      );
    } catch {
      return;
    }
  },
  component: CheckoutSuccessPage,
});

function CheckoutSuccessPage() {
  const { orderId, token, session_id, open_app, cancelled } =
    normalizeCheckoutSuccessSearch(Route.useSearch());
  const isStripeSessionMode = Boolean(session_id);
  const shouldOfferMobileHandoff = isMobileHandoff(open_app);
  const mobileHandoffAttempted = useRef(false);
  const orderByStripeSessionQuery = useQuery({
    queryKey: ["public", "stripe-sessions", session_id, "checkout-order"],
    enabled: isStripeSessionMode,
    queryFn: () => getCheckoutOrderByStripeSession(session_id),
  });
  const orderByTokenQuery = useQuery({
    queryKey: ["public", "checkout-orders", orderId, token],
    enabled: !isStripeSessionMode && Boolean(orderId && token),
    queryFn: () => getCheckoutOrder(orderId, token),
  });
  const activeQuery = isStripeSessionMode ? orderByStripeSessionQuery : orderByTokenQuery;
  const order = activeQuery.data;
  const mobileSuccessURL = useMemo(() => {
    if (!order) {
      return "";
    }

    const params = new URLSearchParams({
      order_id: order.id,
    });
    if (session_id) {
      params.set("session_id", session_id);
    }

    return `eventy-mobile://checkout/success?${params.toString()}`;
  }, [order, session_id]);
  const startPaymentMutation = useMutation({
    mutationFn: () => {
      if (!orderId || !token) {
        throw new Error("Missing order reference to restart payment.");
      }

      return createStripeCheckoutSession(orderId, token);
    },
  });
  const isStartingPayment = startPaymentMutation.isPending;
  const hasCheckoutReference =
    isStripeSessionMode || Boolean(orderId && token);

  useEffect(() => {
    if (!order) {
      return;
    }

    if (order.status === "paid") {
      void clearCart();
    }
  }, [order]);

  useEffect(() => {
    if (!order) {
      return;
    }

    if (order.status === "paid") {
      return;
    }

    const queryKey = isStripeSessionMode
      ? (["public", "stripe-sessions", session_id, "checkout-order"] as const)
      : (["public", "checkout-orders", orderId, token] as const);

    const refetch = () => {
      void queryClient.refetchQueries({ queryKey, exact: true });
    };

    refetch();

    const poll = window.setInterval(refetch, 5000);
    window.addEventListener("focus", refetch);

    return () => {
      window.clearInterval(poll);
      window.removeEventListener("focus", refetch);
    };
  }, [isStripeSessionMode, order, orderId, session_id, token]);

  useEffect(() => {
    if (!shouldOfferMobileHandoff || !mobileSuccessURL || order?.status !== "paid" || mobileHandoffAttempted.current) {
      return;
    }

    mobileHandoffAttempted.current = true;
    const handoffTimer = window.setTimeout(() => {
      window.location.href = mobileSuccessURL;
    }, 900);

    return () => {
      window.clearTimeout(handoffTimer);
    };
  }, [mobileSuccessURL, order?.status, shouldOfferMobileHandoff]);

  async function handlePayNow() {
    if (isStripeSessionMode) {
      return;
    }

    try {
      const stripeSession = await startPaymentMutation.mutateAsync();
      window.location.assign(stripeSession.checkout_url);
    } catch (error) {
      toast.error("Unable to start payment", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    }
  }

  if (!hasCheckoutReference || activeQuery.isLoading || !order) {
    const isLookupError = activeQuery.isError;
    const title = !hasCheckoutReference
      ? "Checkout reference missing"
      : isLookupError
        ? "We could not load this payment yet"
        : "Loading order status";
    const description = !hasCheckoutReference
      ? "This page needs a Stripe session id or an order token to confirm payment."
      : isLookupError
        ? "The payment may still be syncing, or the deployed frontend cannot reach the Eventy API. You can refresh in a moment."
        : "Please wait while we confirm your latest payment state.";

    return (
      <main className="mx-auto max-w-5xl px-4 pb-12 pt-10 sm:pt-14">
        <section className="rounded-[2rem] border border-border/70 bg-card/90 p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            Checkout status
          </p>
          <h1 className="mt-3 font-serif text-4xl font-semibold text-foreground">
            {title}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
            {description}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {hasCheckoutReference ? (
              <Button
                type="button"
                className="rounded-full"
                onClick={() => void activeQuery.refetch()}
              >
                Refresh status
              </Button>
            ) : null}
            <Button asChild variant="outline" className="rounded-full bg-background">
              <Link to="/events">Browse events</Link>
            </Button>
          </div>
        </section>
      </main>
    );
  }

  const isRetryAllowed = !isStripeSessionMode && order.status !== "paid";
  const title =
    order.status === "paid"
      ? "Payment confirmed"
      : isStripeSessionMode
        ? "Payment processing"
        : "Your order is ready for payment";
  const kicker = isStripeSessionMode ? "Payment status" : "Checkout ready";
  const helperText = isStripeSessionMode
    ? `Reference ${order.order_number}. If status is still pending, wait a moment and refresh.`
    : cancelled === "1"
      ? `Payment was not completed for ${order.order_number}. You can retry from here or return to the app.`
    : `We created a pending order from your reserved tickets. The hold stays active until ${new Date(order.expires_at).toLocaleTimeString()}.`;

  return (
    <main className="mx-auto max-w-5xl px-4 pb-12 pt-10 sm:pt-14">
      <section className="rounded-[2rem] border border-border/70 bg-card/90 p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          {kicker}
        </p>
        <h1 className="mt-3 font-serif text-4xl font-semibold text-foreground">
          {title}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
          {helperText}
        </p>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[1.75rem] border border-border/70 bg-card/90 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Order details
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.25rem] border border-border/70 bg-background/70 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Reference
              </p>
              <p className="mt-2 font-semibold text-foreground">
                {order.order_number}
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-border/70 bg-background/70 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Buyer
              </p>
              <p className="mt-2 font-semibold text-foreground">
                {order.customer_name}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {order.customer_email}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {order.items.map((item) => (
              <article
                key={`${item.session_id}-${item.ticket_type_id}`}
                className="rounded-[1.25rem] border border-border/70 bg-background/70 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {item.ticket_type_name}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.event_title}
                    </p>
                    <p className="mt-3 text-sm text-muted-foreground">
                      {formatDateRangeLabel(
                        item.session_starts_at,
                        item.session_ends_at,
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatTimeRangeLabel(
                        item.session_starts_at,
                        item.session_ends_at,
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">
                      {formatPriceLabel(
                        item.unit_price * item.quantity,
                        item.currency,
                      )}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.quantity} x{" "}
                      {formatPriceLabel(item.unit_price, item.currency)}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="rounded-[1.75rem] border border-border/70 bg-card/90 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Payment handoff
          </p>
          <div className="mt-4 rounded-[1.35rem] border border-border/70 bg-background/70 p-5">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Status</span>
              <span className="font-medium text-foreground">{order.status}</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
              <span>Total</span>
              <span>{formatPriceLabel(order.subtotal, order.currency)}</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
              <span>Expires</span>
              <span>{new Date(order.expires_at).toLocaleString()}</span>
            </div>
          </div>

          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            {shouldOfferMobileHandoff && order.status === "paid"
              ? "This checkout started in the Eventy app. If the app does not open automatically, use the button below."
              : isRetryAllowed
              ? "Continue to Stripe Checkout to complete payment. You'll be returned here afterwards to confirm the status."
              : "Refresh this page if payment confirmation takes a few seconds to sync."}
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            {shouldOfferMobileHandoff && mobileSuccessURL ? (
              <Button asChild className="rounded-full">
                <a href={mobileSuccessURL}>Open Eventy app</a>
              </Button>
            ) : null}
            {isRetryAllowed ? (
              <Button
                type="button"
                className="rounded-full"
                disabled={isStartingPayment}
                onClick={() => void handlePayNow()}
              >
                {isStartingPayment ? "Opening Stripe" : "Pay now"}
              </Button>
            ) : null}
            <Button asChild variant="outline" className="rounded-full bg-background">
              <Link to="/events">Browse more events</Link>
            </Button>
            {isStripeSessionMode ? (
              <Button
                type="button"
                variant="outline"
                className="rounded-full bg-background"
                onClick={() => void activeQuery.refetch()}
              >
                Refresh status
              </Button>
            ) : null}
          </div>
        </aside>
      </section>
    </main>
  );
}

function normalizeCheckoutSuccessSearch(search: unknown) {
  const record =
    search && typeof search === "object"
      ? (search as Record<string, unknown>)
      : {};

  return {
    orderId: searchValueToString(record.orderId),
    token: searchValueToString(record.token),
    session_id: searchValueToString(record.session_id),
    open_app: searchValueToString(record.open_app),
    cancelled: searchValueToString(record.cancelled),
  };
}

function searchValueToString(value: unknown) {
  if (typeof value === "string") {
    return parseStringSearchValue(value);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return "";
}

function parseStringSearchValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (typeof parsed === "string") {
      return parsed;
    }
    if (typeof parsed === "number" || typeof parsed === "boolean") {
      return String(parsed);
    }
  } catch {
    // Normal query strings are not JSON; keep the original value.
  }

  return trimmed;
}

function isMobileHandoff(value: string) {
  return value === "1" || value === "true" || value === "mobile";
}
