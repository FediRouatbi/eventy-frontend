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
import { queryClient } from "#/lib/query-client";

export const Route = createFileRoute("/checkout/complete")({
  validateSearch: (search: Record<string, unknown>) => ({
    session_id: typeof search.session_id === "string" ? search.session_id : "",
  }),
  loader: async ({ search }) => {
    if (!search.session_id) {
      throw notFound();
    }

    try {
      await queryClient.ensureQueryData(
        checkoutOrderByStripeSessionQueryOptions(search.session_id),
      );
    } catch {
      throw notFound();
    }
  },
  component: CheckoutCompletePage,
});

function CheckoutCompletePage() {
  const { session_id } = Route.useSearch();
  const { data: order } = useSuspenseQuery(
    checkoutOrderByStripeSessionQueryOptions(session_id),
  );

  useEffect(() => {
    void clearCart();
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-4 pb-12 pt-10 sm:pt-14">
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


