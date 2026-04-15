import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";

import { Button } from "#/components/ui/button";
import {
  formatDateRangeLabel,
  formatPriceLabel,
  formatTimeRangeLabel,
} from "#/features/events/display";
import {
  checkoutOrderQueryOptions,
  createStripeCheckoutSession,
} from "#/lib/api/orders";
import { queryClient } from "#/lib/query-client";

export const Route = createFileRoute("/checkout/success")({
  validateSearch: (search: Record<string, unknown>) => ({
    orderId:
      typeof search.orderId === "string" ? search.orderId : "",
    token: typeof search.token === "string" ? search.token : "",
  }),
  loader: async ({ search }) => {
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
  const { orderId, token } = Route.useSearch();
  const { data: order } = useSuspenseQuery(
    checkoutOrderQueryOptions(orderId, token),
  );
  const startPaymentMutation = useMutation({
    mutationFn: () => createStripeCheckoutSession(orderId, token),
  });
  const isStartingPayment = startPaymentMutation.isPending;

  useEffect(() => {
    if (order.status === "paid") {
      return;
    }

    const queryKey = [
      "public",
      "checkout-orders",
      orderId,
      token,
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
  }, [order.status, orderId, token]);

  async function handlePayNow() {
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

  return (
    <main className="mx-auto max-w-5xl px-4 pb-12 pt-10 sm:pt-14">
      <section className="rounded-[2rem] border border-border/70 bg-card/90 p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          Checkout ready
        </p>
        <h1 className="mt-3 font-serif text-4xl font-semibold text-foreground">
          Your order is ready for payment
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
          We created a pending order from your reserved tickets. The hold stays
          active until {new Date(order.expires_at).toLocaleTimeString()}.
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
            Continue to Stripe Checkout to complete payment. You'll be returned
            here afterwards to confirm the status.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              type="button"
              className="rounded-full"
              disabled={isStartingPayment}
              onClick={() => void handlePayNow()}
            >
              {isStartingPayment ? "Opening Stripe" : "Pay now"}
            </Button>
            <Button asChild variant="outline" className="rounded-full bg-background">
              <Link to="/events">Browse more events</Link>
            </Button>
          </div>
        </aside>
      </section>
    </main>
  );
}
