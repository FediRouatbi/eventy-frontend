import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect } from "react";

import { Button } from "#/components/ui/button";
import {
  formatDateRangeLabel,
  formatPriceLabel,
  formatTimeRangeLabel,
} from "#/features/events/display";
import { checkoutOrderByStripeSessionQueryOptions } from "#/lib/api/orders";
import { clearCart } from "#/lib/cart";
import { rememberStripeCheckoutSession } from "#/lib/orders-history";
import { queryClient } from "#/lib/query-client";

export const Route = createFileRoute("/checkout/complete")({
  validateSearch: (search: unknown) => {
    const record =
      search && typeof search === "object"
        ? (search as Record<string, unknown>)
        : {};

    return {
      session_id:
        typeof record.session_id === "string" ? record.session_id : "",
    };
  },
  loader: async ({ search, location }) => {
    const sessionId =
      typeof search?.session_id === "string"
        ? search.session_id
        : typeof (location.search as Record<string, unknown> | undefined)
              ?.session_id === "string"
          ? String(
              (location.search as Record<string, unknown> | undefined)
                ?.session_id,
            )
          : "";

    if (!sessionId) {
      throw notFound();
    }

    await queryClient.ensureQueryData(
      checkoutOrderByStripeSessionQueryOptions(sessionId),
    );
  },
  pendingComponent: CheckoutCompletePending,
  component: CheckoutCompletePage,
});

function CheckoutCompletePending() {
  return (
    <main className="mx-auto min-h-[calc(100vh-11rem)] max-w-5xl px-4 pb-12 pt-10 sm:pt-14">
      <section className="rounded-[2rem] border border-border/70 bg-card/90 p-6 shadow-sm sm:p-8">
        <div className="h-3 w-28 rounded-full bg-muted/60" />
        <div className="mt-4 h-10 w-72 max-w-full rounded-[1rem] bg-muted/60" />
        <div className="mt-4 space-y-2">
          <div className="h-3 w-[min(34rem,100%)] rounded-full bg-muted/50" />
          <div className="h-3 w-[min(30rem,100%)] rounded-full bg-muted/50" />
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[1.75rem] border border-border/70 bg-card/90 p-5 shadow-sm">
          <div className="h-3 w-32 rounded-full bg-muted/60" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.25rem] border border-border/70 bg-background/70 p-4">
              <div className="h-3 w-16 rounded-full bg-muted/50" />
              <div className="mt-3 h-4 w-40 rounded-full bg-muted/60" />
              <div className="mt-2 h-3 w-48 rounded-full bg-muted/50" />
            </div>
            <div className="rounded-[1.25rem] border border-border/70 bg-background/70 p-4">
              <div className="h-3 w-16 rounded-full bg-muted/50" />
              <div className="mt-3 h-4 w-24 rounded-full bg-muted/60" />
              <div className="mt-2 h-3 w-44 rounded-full bg-muted/50" />
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div className="rounded-[1.25rem] border border-border/70 bg-background/70 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="h-4 w-44 rounded-full bg-muted/60" />
                  <div className="h-3 w-56 rounded-full bg-muted/50" />
                  <div className="mt-4 h-3 w-40 rounded-full bg-muted/50" />
                  <div className="h-3 w-36 rounded-full bg-muted/50" />
                </div>
                <div className="space-y-2 text-right">
                  <div className="ml-auto h-4 w-24 rounded-full bg-muted/60" />
                  <div className="ml-auto h-3 w-28 rounded-full bg-muted/50" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside className="rounded-[1.75rem] border border-border/70 bg-card/90 p-5 shadow-sm">
          <div className="h-3 w-16 rounded-full bg-muted/60" />
          <div className="mt-4 rounded-[1.35rem] border border-border/70 bg-background/70 p-5">
            <div className="flex items-center justify-between">
              <div className="h-3 w-16 rounded-full bg-muted/50" />
              <div className="h-3 w-20 rounded-full bg-muted/50" />
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <div className="h-10 w-32 rounded-full bg-muted/60" />
            <div className="h-10 w-32 rounded-full bg-muted/50" />
          </div>
        </aside>
      </section>
    </main>
  );
}

function CheckoutCompletePage() {
  const { session_id } = Route.useSearch();
  const { data: order } = useSuspenseQuery(
    checkoutOrderByStripeSessionQueryOptions(session_id),
  );

  useEffect(() => {
    void clearCart();
  }, []);

  useEffect(() => {
    rememberStripeCheckoutSession(session_id);
  }, [session_id]);

  useEffect(() => {
    if (order.status === "paid") {
      return;
    }

    const queryKey = [
      "public",
      "stripe-sessions",
      session_id,
      "checkout-order",
    ] as const;

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
  }, [order.status, session_id]);

  return (
    <main className="mx-auto min-h-[calc(100vh-11rem)] max-w-5xl px-4 pb-12 pt-10 sm:pt-14">
      <section className="rounded-[2rem] border border-border/70 bg-card/90 p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          Payment status
        </p>
        <h1 className="mt-3 font-serif text-4xl font-semibold text-foreground">
          {order.status === "paid" ? "Payment confirmed" : "Payment processing"}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
          Reference {order.order_number}. If the status still says pending, wait
          a moment and refresh. Stripe webhooks can take a few seconds.
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
                Buyer
              </p>
              <p className="mt-2 font-semibold text-foreground">
                {order.customer_name}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {order.customer_email}
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-border/70 bg-background/70 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Status
              </p>
              <p className="mt-2 font-semibold text-foreground">{order.status}</p>
              {order.paid_at ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  Paid at {new Date(order.paid_at).toLocaleString()}
                </p>
              ) : null}
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
            Total
          </p>
          <div className="mt-4 rounded-[1.35rem] border border-border/70 bg-background/70 p-5">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Amount</span>
              <span>{formatPriceLabel(order.subtotal, order.currency)}</span>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild className="rounded-full">
              <Link to="/events">Browse events</Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-full bg-background"
              onClick={() => window.location.reload()}
            >
              Refresh status
            </Button>
          </div>
        </aside>
      </section>
    </main>
  );
}


