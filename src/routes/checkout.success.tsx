import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, notFound } from "@tanstack/react-router";
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
  validateSearch: (search: Record<string, unknown>) => ({
    orderId:
      typeof search.orderId === "string" ? search.orderId : "",
    token: typeof search.token === "string" ? search.token : "",
    session_id: typeof search.session_id === "string" ? search.session_id : "",
    open_app: typeof search.open_app === "string" ? search.open_app : "",
    cancelled: typeof search.cancelled === "string" ? search.cancelled : "",
  }),
  loader: async ({ search }) => {
    if (search.session_id) {
      try {
        await queryClient.ensureQueryData(
          checkoutOrderByStripeSessionQueryOptions(search.session_id),
        );
        return;
      } catch {
        throw notFound();
      }
    }

    if (!search.orderId || !search.token) {
      throw notFound();
    }

    try {
      await queryClient.ensureQueryData(
        checkoutOrderQueryOptions(search.orderId, search.token),
      );
    } catch {
      throw notFound();
    }
  },
  component: CheckoutSuccessPage,
});

function CheckoutSuccessPage() {
  const { orderId, token, session_id, open_app, cancelled } = Route.useSearch();
  const isStripeSessionMode = Boolean(session_id);
  const shouldOfferMobileHandoff = open_app === "1";
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

  if (activeQuery.isLoading || !order) {
    return (
      <main className="mx-auto max-w-5xl px-4 pb-12 pt-10 sm:pt-14">
        <section className="rounded-[2rem] border border-border/70 bg-card/90 p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            Checkout status
          </p>
          <h1 className="mt-3 font-serif text-4xl font-semibold text-foreground">
            Loading order status
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
            Please wait while we confirm your latest payment state.
          </p>
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
