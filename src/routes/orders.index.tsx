import { useQueries, useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ReceiptText, RefreshCw } from "lucide-react";

import { Button } from "#/components/ui/button";
import { Badge } from "#/components/ui/badge";
import { formatPriceLabel } from "#/features/events/display";
import { getCheckoutOrderByStripeSession, listMyCheckoutOrders } from "#/lib/api/orders";
import { useAuthSession } from "#/lib/auth";
import { useOrderHistory } from "#/lib/orders-history";

export const Route = createFileRoute("/orders/")({
  component: OrdersPage,
});

function OrdersPage() {
  const session = useAuthSession();
  const history = useOrderHistory();
  const sessionIds = history.stripe_session_ids;

  const {
    data: apiOrders = [],
    isLoading: isApiOrdersLoading,
    error: apiOrdersError,
    refetch: refetchApiOrders,
  } = useQuery({
    queryKey: ["me", "orders", session?.access_token],
    enabled: Boolean(session?.access_token),
    queryFn: () => listMyCheckoutOrders(session!.access_token, 20),
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const results = useQueries({
    queries: sessionIds.map((sessionId) => ({
      queryKey: ["public", "stripe-sessions", sessionId, "checkout-order"],
      queryFn: () => getCheckoutOrderByStripeSession(sessionId),
      refetchInterval: 5000,
      refetchOnWindowFocus: true,
      staleTime: 0,
    })),
  });

  return (
    <main className="mx-auto max-w-5xl px-4 pb-12 pt-10 sm:pt-14">
      <section className="rounded-[2rem] border border-border/70 bg-card/90 p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          Orders
        </p>
        <h1 className="mt-3 font-serif text-4xl font-semibold text-foreground">
          Your recent checkouts
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
          {session
            ? "Signed-in orders follow your account across devices. Recent guest sessions also appear below."
            : "This list is built from your recent Stripe sessions on this device."}
        </p>
      </section>

      {session ? (
        <section className="mt-8 space-y-4">
          <div className="flex flex-col gap-3 rounded-[1.75rem] border border-border/70 bg-card/90 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Account orders
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {apiOrdersError instanceof Error
                  ? apiOrdersError.message
                  : isApiOrdersLoading
                    ? "Fetching your orders…"
                    : `${apiOrders.length} order${apiOrders.length === 1 ? "" : "s"} found`}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="rounded-full bg-background"
              onClick={() => void refetchApiOrders()}
            >
              <RefreshCw className="size-4" />
              Refresh
            </Button>
          </div>

          {apiOrders.map((order) => (
            <article
              key={order.id}
              className="rounded-[1.75rem] border border-border/70 bg-card/90 p-5 shadow-sm"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      {order.order_number}
                    </p>
                    <Badge variant="outline" className="rounded-full">
                      {order.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {order.customer_name} · {order.customer_email}
                  </p>
                </div>

                {order.stripe_checkout_session_id ? (
                  <Button asChild className="rounded-full">
                    <Link
                      to="/checkout/complete"
                      search={{ session_id: order.stripe_checkout_session_id }}
                    >
                      <ReceiptText className="size-4" />
                      View receipt
                    </Link>
                  </Button>
                ) : null}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.25rem] border border-border/70 bg-background/70 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Total
                  </p>
                  <p className="mt-2 font-semibold text-foreground">
                    {formatPriceLabel(order.subtotal, order.currency)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Updated {new Date(order.updated_at).toLocaleString()}
                  </p>
                </div>
                <div className="rounded-[1.25rem] border border-border/70 bg-background/70 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Items
                  </p>
                  <p className="mt-2 font-semibold text-foreground">
                    {order.items.length} line{order.items.length === 1 ? "" : "s"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {order.items
                      .slice(0, 2)
                      .map((item) => `${item.quantity} × ${item.ticket_type_name}`)
                      .join(" · ")}
                    {order.items.length > 2 ? " · …" : ""}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {sessionIds.length === 0 ? (
        <section className="mt-8 rounded-[1.75rem] border border-dashed border-border/70 bg-card/70 p-8 text-center">
          <p className="text-lg font-semibold text-foreground">
            No orders yet.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Checkout from an event to see receipts and payment status here.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Button asChild className="rounded-full">
              <Link to="/events">Browse events</Link>
            </Button>
          </div>
        </section>
      ) : (
        <section className="mt-8 space-y-4">
          {results.map((result, index) => {
            const sessionId = sessionIds[index];
            const order = result.data;
            const isLoading = result.isLoading || result.isFetching;
            const errorMessage =
              result.error instanceof Error ? result.error.message : "";

            return (
              <article
                key={sessionId}
                className="rounded-[1.75rem] border border-border/70 bg-card/90 p-5 shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        {order?.order_number ?? "Order"}
                      </p>
                      <Badge variant="outline" className="rounded-full">
                        {order?.status ?? (isLoading ? "loading" : "unknown")}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {order
                        ? `${order.customer_name} · ${order.customer_email}`
                        : errorMessage
                          ? errorMessage
                          : "Fetching the latest status from the API…"}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full bg-background"
                      disabled={isLoading}
                      onClick={() => void result.refetch()}
                    >
                      <RefreshCw className="size-4" />
                      Refresh
                    </Button>
                    <Button asChild className="rounded-full" disabled={!order}>
                      <Link to="/checkout/complete" search={{ session_id: sessionId }}>
                        <ReceiptText className="size-4" />
                        View receipt
                      </Link>
                    </Button>
                  </div>
                </div>

                {order ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[1.25rem] border border-border/70 bg-background/70 p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Total
                      </p>
                      <p className="mt-2 font-semibold text-foreground">
                        {formatPriceLabel(order.subtotal, order.currency)}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Updated {new Date(order.updated_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-[1.25rem] border border-border/70 bg-background/70 p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Items
                      </p>
                      <p className="mt-2 font-semibold text-foreground">
                        {order.items.length} line{order.items.length === 1 ? "" : "s"}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {order.items
                          .slice(0, 2)
                          .map((item) => `${item.quantity} × ${item.ticket_type_name}`)
                          .join(" · ")}
                        {order.items.length > 2 ? " · …" : ""}
                      </p>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
