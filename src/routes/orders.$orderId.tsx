import { useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, redirect } from "@tanstack/react-router";
import {
  CheckCircle2,
  CircleDashed,
  Download,
  MailCheck,
  ReceiptText,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
  formatDateRangeLabel,
  formatPriceLabel,
  formatTimeRangeLabel,
} from "#/features/events/display";
import {
  getMyCheckoutOrderById,
  type CheckoutOrder,
} from "#/lib/api/orders";
import { getAuthSession, hydrateAuthSession, useAuthSession } from "#/lib/auth";

export const Route = createFileRoute("/orders/$orderId")({
  beforeLoad: async () => {
    if (typeof window === "undefined") {
      return;
    }

    const session = getAuthSession() ?? (await hydrateAuthSession());
    if (!session) {
      throw redirect({ to: "/login" });
    }
  },
  component: OrderReceiptPage,
});

function ReceiptSkeleton() {
  return (
    <main className="mx-auto min-h-[calc(100vh-11rem)] max-w-5xl px-4 pb-12 pt-10 sm:pt-14">
      <section className="app-surface rounded-[2rem] p-6 sm:p-8">
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

function formatDateTimeLabel(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString();
}

function buildPaymentTimeline(order: CheckoutOrder) {
  return [
    {
      id: "created",
      label: "Order created",
      detail: `We reserved your tickets on ${formatDateTimeLabel(order.created_at)}.`,
      done: true,
    },
    {
      id: "payment",
      label: order.paid_at ? "Payment confirmed" : "Payment pending",
      detail: order.paid_at
        ? `Payment was completed on ${formatDateTimeLabel(order.paid_at)}.`
        : `Current status is ${order.status}. Complete payment before ${formatDateTimeLabel(order.expires_at)}.`,
      done: Boolean(order.paid_at),
    },
    {
      id: "receipt",
      label: order.tickets_emailed_at ? "Tickets emailed" : "Receipt ready",
      detail: order.tickets_emailed_at
        ? `Tickets were emailed on ${formatDateTimeLabel(order.tickets_emailed_at)}.`
        : "Your receipt is available now. You can download it as PDF anytime.",
      done: Boolean(order.tickets_emailed_at),
    },
    {
      id: "updated",
      label: "Last update",
      detail: `Order updated on ${formatDateTimeLabel(order.updated_at)}.`,
      done: true,
    },
  ];
}

async function downloadReceiptPdf(order: CheckoutOrder) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageHeight = doc.internal.pageSize.getHeight();
  let cursorY = 56;

  const addLine = (line: string, options?: { bold?: boolean; indent?: number; size?: number }) => {
    if (cursorY > pageHeight - 56) {
      doc.addPage();
      cursorY = 56;
    }

    doc.setFont("helvetica", options?.bold ? "bold" : "normal");
    doc.setFontSize(options?.size ?? 11);
    doc.text(line, 48 + (options?.indent ?? 0), cursorY);
    cursorY += 18;
  };

  addLine("Eventy receipt", { bold: true, size: 18 });
  addLine(`Order: ${order.order_number}`, { bold: true, size: 13 });
  addLine(`Status: ${order.status}`);
  addLine(`Customer: ${order.customer_name} (${order.customer_email})`);
  addLine(`Created: ${formatDateTimeLabel(order.created_at)}`);
  addLine(`Paid: ${formatDateTimeLabel(order.paid_at)}`);
  addLine(`Updated: ${formatDateTimeLabel(order.updated_at)}`);
  addLine("");
  addLine("Items", { bold: true, size: 13 });

  for (const item of order.items) {
    addLine(`${item.ticket_type_name} — ${formatPriceLabel(item.unit_price * item.quantity, item.currency)}`, {
      bold: true,
    });
    addLine(item.event_title, { indent: 12 });
    addLine(formatDateRangeLabel(item.session_starts_at, item.session_ends_at), { indent: 12 });
    addLine(
      `${item.quantity} x ${formatPriceLabel(item.unit_price, item.currency)}`,
      { indent: 12 },
    );
    addLine("");
  }

  addLine(`Total: ${formatPriceLabel(order.subtotal, order.currency)}`, { bold: true, size: 13 });
  doc.save(`receipt-${order.order_number}.pdf`);
}

function OrderReceiptPage() {
  const session = useAuthSession();
  const { orderId } = Route.useParams();
  const [isDownloading, setIsDownloading] = useState(false);

  const {
    data: order,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ["me", "orders", orderId, session?.access_token],
    enabled: Boolean(session?.access_token && orderId),
    queryFn: () => getMyCheckoutOrderById(orderId, session!.access_token),
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  });

  if (!session || (isLoading && !order)) {
    return <ReceiptSkeleton />;
  }

  const errorMessage = error instanceof Error ? error.message : "";
  if (!order) {
    return (
      <main className="mx-auto max-w-5xl px-4 pb-12 pt-10 sm:pt-14">
        <section className="app-surface rounded-[2rem] p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            Order
          </p>
          <h1 className="mt-3 font-serif text-4xl font-semibold text-foreground">
            Receipt unavailable
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
            {errorMessage || "We couldn't load this receipt."}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild className="rounded-full">
              <Link to="/orders">Back to orders</Link>
            </Button>
          </div>
        </section>
      </main>
    );
  }

  const timeline = buildPaymentTimeline(order);

  const handleDownload = async () => {
    if (isDownloading) {
      return;
    }

    setIsDownloading(true);

    try {
      await downloadReceiptPdf(order);
      toast.success("Receipt downloaded");
    } catch {
      toast.error("Failed to download receipt PDF");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <main className="mx-auto min-h-[calc(100vh-11rem)] max-w-5xl px-4 pb-12 pt-10 sm:pt-14">
      <section className="app-surface rounded-[2rem] p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          Receipt
        </p>
        <h1 className="mt-3 font-serif text-4xl font-semibold text-foreground">
          {order.order_number}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
          Status: {order.status}. Updated {new Date(order.updated_at).toLocaleString()}.
        </p>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="app-surface rounded-[1.75rem] p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Order details
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="rounded-full">
                {order.status}
              </Badge>
              <Button
                type="button"
                variant="outline"
                className="rounded-full bg-background"
                disabled={isFetching}
                onClick={() => void refetch()}
              >
                <RefreshCw className="size-4" />
                Refresh
              </Button>
            </div>
          </div>

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
                Total
              </p>
              <p className="mt-2 font-semibold text-foreground">
                {formatPriceLabel(order.subtotal, order.currency)}
              </p>
              {order.paid_at ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  Paid at {new Date(order.paid_at).toLocaleString()}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-5 rounded-[1.25rem] border border-border/70 bg-background/70 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Payment timeline
            </p>
            <ul className="mt-4 space-y-3">
              {timeline.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/80 p-3"
                >
                  {entry.id === "receipt" && entry.done ? (
                    <MailCheck className="mt-0.5 size-4 text-primary" />
                  ) : entry.done ? (
                    <CheckCircle2 className="mt-0.5 size-4 text-primary" />
                  ) : (
                    <CircleDashed className="mt-0.5 size-4 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-foreground">{entry.label}</p>
                    <p className="text-sm text-muted-foreground">{entry.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
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
                      {formatDateRangeLabel(item.session_starts_at, item.session_ends_at)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatTimeRangeLabel(item.session_starts_at, item.session_ends_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">
                      {formatPriceLabel(item.unit_price * item.quantity, item.currency)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.quantity} x {formatPriceLabel(item.unit_price, item.currency)}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="app-surface rounded-[1.75rem] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Actions
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              className="rounded-full bg-background"
              onClick={() => void handleDownload()}
              disabled={isDownloading}
            >
              <Download className="size-4" />
              {isDownloading ? "Generating PDF..." : "Download PDF receipt"}
            </Button>
            <Button asChild variant="outline" className="rounded-full bg-background">
              <Link to="/orders">
                <ReceiptText className="size-4" />
                Back to orders
              </Link>
            </Button>
            <Button asChild className="rounded-full">
              <Link to="/events">Browse events</Link>
            </Button>
          </div>
        </aside>
      </section>
    </main>
  );
}
