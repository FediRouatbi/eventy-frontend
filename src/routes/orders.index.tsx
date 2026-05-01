import { useQuery } from '@tanstack/react-query';
import { Link, createFileRoute, redirect } from '@tanstack/react-router';
import { ReceiptText, RefreshCw } from 'lucide-react';

import { Badge } from '#/components/ui/badge';
import { Button } from '#/components/ui/button';
import { formatPriceLabel } from '#/features/events/display';
import { listMyCheckoutOrders } from '#/lib/api/orders';
import { getAuthSession, hydrateAuthSession, useAuthSession } from '#/lib/auth';

export const Route = createFileRoute('/orders/')({
  beforeLoad: async () => {
    if (typeof window === 'undefined') {
      return;
    }

    const session = getAuthSession() ?? (await hydrateAuthSession());
    if (!session) {
      throw redirect({ to: '/login' });
    }
  },
  component: OrdersPage,
});

function OrdersSkeleton({ items = 1 }: { items?: number }) {
  return (
    <section className="mt-8 space-y-4">
      <div className="flex flex-col gap-3 rounded-[1.75rem] border border-border/70 bg-card/90 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-3 w-28 rounded-full bg-muted/60" />
          <div className="h-3 w-44 rounded-full bg-muted/50" />
        </div>
        <div className="h-10 w-28 rounded-full bg-muted/50" />
      </div>

      {Array.from({ length: items }).map((_, index) => (
        <article
          key={`orders-skeleton-${index}`}
          className="rounded-[1.75rem] border border-border/70 bg-card/90 p-5 shadow-sm"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="h-4 w-40 rounded-full bg-muted/60" />
              <div className="h-3 w-56 rounded-full bg-muted/50" />
            </div>
            <div className="h-10 w-32 rounded-full bg-muted/60" />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.25rem] border border-border/70 bg-background/70 p-4">
              <div className="h-3 w-12 rounded-full bg-muted/50" />
              <div className="mt-3 h-4 w-24 rounded-full bg-muted/60" />
              <div className="mt-2 h-3 w-36 rounded-full bg-muted/50" />
            </div>
            <div className="rounded-[1.25rem] border border-border/70 bg-background/70 p-4">
              <div className="h-3 w-12 rounded-full bg-muted/50" />
              <div className="mt-3 h-4 w-20 rounded-full bg-muted/60" />
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}

function OrdersPage() {
  const session = useAuthSession();

  const {
    data: apiOrders = [],
    isLoading: isApiOrdersLoading,
    error: apiOrdersError,
    refetch: refetchApiOrders,
  } = useQuery({
    queryKey: ['me', 'orders', session?.access_token],
    enabled: Boolean(session?.access_token),
    queryFn: () => listMyCheckoutOrders(session!.access_token, 20),
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  });

  const isAccountInitialLoading = isApiOrdersLoading && apiOrders.length === 0;
  const hasAnyOrders = apiOrders.length > 0;

  if (!session || (isAccountInitialLoading && !hasAnyOrders)) {
    return (
      <main className="mx-auto max-w-5xl px-4 pb-12 pt-10 sm:pt-14">
        <section className="app-surface rounded-[2rem] p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            Orders
          </p>
          <h1 className="mt-3 font-serif text-4xl font-semibold text-foreground">
            Your recent checkouts
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
            Loading your orders and receipts...
          </p>
        </section>

        <OrdersSkeleton items={1} />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 pb-12 pt-10 sm:pt-14">
      <section className="app-surface rounded-[2rem] p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          Orders
        </p>
        <h1 className="mt-3 font-serif text-4xl font-semibold text-foreground">
          Your recent checkouts
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
          Signed-in orders follow your account across devices.
        </p>
      </section>

      <section className="mt-8 space-y-4">
        <div className="app-surface flex flex-col gap-3 rounded-[1.75rem] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Account orders
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {apiOrdersError instanceof Error
                ? apiOrdersError.message
                : isApiOrdersLoading
                  ? 'Fetching your orders...'
                  : `${apiOrders.length} order${apiOrders.length === 1 ? '' : 's'} found`}
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
          <article key={order.id} className="app-surface rounded-[1.75rem] p-5">
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
                  {order.customer_name} - {order.customer_email}
                </p>
              </div>

              <Button asChild className="rounded-full">
                <Link
                  to="/orders/$orderId"
                  params={{ orderId: order.id }}
                >
                  <ReceiptText className="size-4" />
                  View receipt
                </Link>
              </Button>
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
                  {order.items.length} line{order.items.length === 1 ? '' : 's'}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {order.items
                    .slice(0, 2)
                    .map(
                      (item) => `${item.quantity} x ${item.ticket_type_name}`,
                    )
                    .join(' - ')}
                  {order.items.length > 2 ? ' - ...' : ''}
                </p>
              </div>
            </div>
          </article>
        ))}
      </section>

      {!isApiOrdersLoading && !hasAnyOrders ? (
        <section className="mt-8 rounded-[1.75rem] border border-dashed border-border/70 bg-card/70 p-8 text-center">
          <p className="text-lg font-semibold text-foreground">
            No orders for this account yet.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Complete a checkout to see receipts and payment status here.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Button asChild className="rounded-full">
              <Link to="/events">Browse events</Link>
            </Button>
          </div>
        </section>
      ) : null}
    </main>
  );
}
