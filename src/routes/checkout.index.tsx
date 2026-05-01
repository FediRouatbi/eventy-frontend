import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "#/components/ui/alert-dialog";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import {
  formatDateRangeLabel,
  formatPriceLabel,
  formatTimeRangeLabel,
} from "#/features/events/display";
import { createCheckoutOrder, createStripeCheckoutSession } from "#/lib/api/orders";
import { useAuthSession } from "#/lib/auth";
import {
  clearCart,
  getCartSubtotal,
  moveSavedSelectionToCart,
  removeCartItem,
  removeSavedTicketSelection,
  updateCartItemQuantity,
  useCart,
  useReservationCountdown,
  useSavedTickets,
} from "#/lib/cart";
import { DEFAULT_CURRENCY_CODE } from "#/lib/currency";

export const Route = createFileRoute("/checkout/")({
  validateSearch: (search: unknown) => {
    const record =
      search && typeof search === "object"
        ? (search as Record<string, unknown>)
        : {};

    const cancelled = record.cancelled;
    if (cancelled === "1" || cancelled === "true") {
      return { cancelled: cancelled as "1" | "true" };
    }

    return {};
  },
  component: CheckoutPage,
});

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function CheckoutPage() {
  const navigate = useNavigate();
  const { cancelled } = Route.useSearch();
  const session = useAuthSession();
  const cart = useCart();
  const savedTickets = useSavedTickets();
  const subtotal = getCartSubtotal(cart.items);
  const currency = cart.items[0]?.currency ?? DEFAULT_CURRENCY_CODE;
  const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const distinctTickets = cart.items.length;
  const countdown = useReservationCountdown(cart.expires_at);
  const [customerName, setCustomerName] = useState(session?.user.name ?? "");
  const [customerEmail, setCustomerEmail] = useState(session?.user.email ?? "");
  const [hydrated, setHydrated] = useState(false);
  const [showBuyerErrors, setShowBuyerErrors] = useState(false);
  const [touchedBuyerFields, setTouchedBuyerFields] = useState({
    name: false,
    email: false,
  });
  const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false);
  const createOrderMutation = useMutation({
    mutationFn: (payload: {
      reservation_id: string;
      reservation_token: string;
      customer_name: string;
      customer_email: string;
    }) => createCheckoutOrder(payload),
  });
  const createPaymentSessionMutation = useMutation({
    mutationFn: (payload: { orderId: string; orderToken: string }) =>
      createStripeCheckoutSession(payload.orderId, payload.orderToken),
  });
  const isCreatingOrder =
    createOrderMutation.isPending || createPaymentSessionMutation.isPending;
  const trimmedCustomerName = customerName.trim();
  const trimmedCustomerEmail = customerEmail.trim();
  const buyerNameError =
    trimmedCustomerName.length === 0 ? "Full name is required" : "";
  const buyerEmailError =
    trimmedCustomerEmail.length === 0
      ? "Email address is required"
      : EMAIL_PATTERN.test(trimmedCustomerEmail)
        ? ""
        : "Enter a valid email address";
  const isBuyerDetailsValid = !buyerNameError && !buyerEmailError;
  const shouldShowNameError = (showBuyerErrors || touchedBuyerFields.name) && Boolean(buyerNameError);
  const shouldShowEmailError =
    (showBuyerErrors || touchedBuyerFields.email) && Boolean(buyerEmailError);
  const isContinueDisabled =
    isCreatingOrder || (Boolean(session) && !isBuyerDetailsValid);
  const sessionGroups = useMemo(() => {
    const grouped = new Map<
      string,
      {
        event_id: string;
        event_title: string;
        session_id: string;
        session_starts_at: string;
        session_ends_at?: string | null;
        currency: string;
        items: typeof cart.items;
      }
    >();

    for (const item of cart.items) {
      const key = `${item.event_id}:${item.session_id}`;
      const existing = grouped.get(key);

      if (existing) {
        existing.items.push(item);
        continue;
      }

      grouped.set(key, {
        event_id: item.event_id,
        event_title: item.event_title,
        session_id: item.session_id,
        session_starts_at: item.session_starts_at,
        session_ends_at: item.session_ends_at,
        currency: item.currency,
        items: [item],
      });
    }

    return Array.from(grouped.values());
  }, [cart.items]);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (!countdown.expired || cart.items.length === 0) {
      return;
    }

    void clearCart();
    toast.error("Reservation expired", {
      description:
        "Your held tickets were released after 10 minutes. Add them again to continue.",
    });
  }, [cart.items.length, countdown.expired, hydrated]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (!cancelled) {
      return;
    }

    toast("Payment cancelled", {
      description:
        "No charge was made. Your cart is still here if you want to try again.",
    });

    void navigate({
      to: "/checkout",
      search: {},
      replace: true,
    });
  }, [cancelled, hydrated]);

  useEffect(() => {
    if (!session) {
      return;
    }

    setCustomerName((current) => current || session.user.name);
    setCustomerEmail((current) => current || session.user.email);
  }, [session]);

  async function handleContinueToPayment() {
    if (!session) {
      setIsLoginPromptOpen(true);
      return;
    }

    setShowBuyerErrors(true);

    if (!isBuyerDetailsValid) {
      toast.error("Complete buyer details", {
        description: "Enter a valid full name and email before continuing.",
      });
      return;
    }

    if (!cart.reservation_id || !cart.reservation_token) {
      toast.error("Your reservation is missing", {
        description: "Add tickets again before continuing.",
      });
      return;
    }

    try {
      const order = await createOrderMutation.mutateAsync({
        reservation_id: cart.reservation_id,
        reservation_token: cart.reservation_token,
        customer_name: trimmedCustomerName,
        customer_email: trimmedCustomerEmail,
      });

      toast.success("Order created", {
        description: `Reference ${order.order_number} is ready for payment.`,
      });

      try {
        toast.message("Opening Stripe Checkout...", {
          description:
            "Complete payment in the new page, then you'll be returned here.",
        });
        const stripeSession = await createPaymentSessionMutation.mutateAsync({
          orderId: order.id,
          orderToken: order.token,
        });
        window.location.assign(stripeSession.checkout_url);
      } catch (error) {
        toast.error("Unable to start payment", {
          description: error instanceof Error ? error.message : "Please try again.",
        });

        await navigate({
          to: "/checkout/success",
          search: {
            orderId: order.id,
            token: order.token,
          },
        });
      }
    } catch (error) {
      toast.error("Unable to continue to payment", {
        description:
          error instanceof Error
            ? error.message
            : "Please try again.",
      });
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pb-12 pt-10 sm:pt-14">
      <section className="rounded-[2rem] border border-border/70 bg-card/90 p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          Checkout
        </p>
        <h1 className="mt-3 font-serif text-4xl font-semibold text-foreground">
          Review your tickets
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
          Adjust quantities, confirm the right session, then move into payment.
        </p>
        {cart.items.length > 0 && cart.expires_at ? (
          <div className="mt-5 inline-flex items-center gap-3 rounded-full border border-primary/20 bg-primary/8 px-4 py-2 text-sm text-foreground">
            <span className="font-medium">Reservation hold</span>
            <span className="text-primary">{countdown.formatted}</span>
            <span className="text-muted-foreground">
              Held tickets are released automatically when the timer ends.
            </span>
          </div>
        ) : null}
      </section>

      {!hydrated ? (
        <section className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <div className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-sm">
              <div className="h-3 w-40 rounded-full bg-muted/60" />
              <div className="mt-4 space-y-2">
                <div className="h-8 w-72 max-w-full rounded-[1rem] bg-muted/60" />
                <div className="h-4 w-44 rounded-full bg-muted/50" />
              </div>
              <div className="mt-6 grid gap-3">
                <div className="h-24 rounded-[1.35rem] border border-border/70 bg-background/70 p-4" />
                <div className="h-24 rounded-[1.35rem] border border-border/70 bg-background/70 p-4" />
              </div>
            </div>
          </div>
          <aside className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-sm">
            <div className="h-3 w-32 rounded-full bg-muted/60" />
            <div className="mt-4 h-44 rounded-[1.35rem] border border-border/70 bg-background/70 p-4" />
            <div className="mt-5 h-11 w-full rounded-full bg-muted/60" />
            <div className="mt-3 h-11 w-full rounded-full bg-muted/50" />
          </aside>
        </section>
      ) : cart.items.length === 0 ? (
        <section className="mt-8 rounded-[1.75rem] border border-dashed border-border/70 bg-card/70 p-8 text-center">
          <h2 className="font-serif text-2xl font-semibold text-foreground">
            Your cart is empty
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Start from an event page and add tickets to continue.
          </p>
          <Button asChild className="mt-5 rounded-full">
            <Link to="/events">Browse events</Link>
          </Button>
        </section>
      ) : (
        <section className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            {sessionGroups.map((sessionGroup) => (
              <article
                key={`${sessionGroup.event_id}-${sessionGroup.session_id}`}
                className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-sm"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {sessionGroup.event_title}
                  </p>
                  <div className="mt-2 space-y-1">
                    <h2 className="font-serif text-2xl font-semibold text-foreground">
                      {formatDateRangeLabel(
                        sessionGroup.session_starts_at,
                        sessionGroup.session_ends_at,
                      )}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {formatTimeRangeLabel(
                        sessionGroup.session_starts_at,
                        sessionGroup.session_ends_at,
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  {sessionGroup.items.map((item) => (
                    <div
                      key={`${item.session_id}-${item.ticket_type_id}`}
                      className="rounded-[1.25rem] border border-border/70 bg-background/60 p-4"
                    >
                      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg font-semibold text-foreground">
                            {item.ticket_type_name}
                          </h3>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <span className="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs text-foreground">
                              Unit price: {formatPriceLabel(item.unit_price, item.currency)}
                            </span>
                            <span className="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs text-foreground">
                              Max per ticket: {item.max_per_order}
                            </span>
                            <span className="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs text-foreground">
                              Available: {item.available_quantity}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-3 sm:min-w-60">
                          <div className="rounded-[1.15rem] border border-border/70 bg-card/80 p-4">
                            <div className="flex items-center justify-between gap-3 text-sm">
                              <span className="text-muted-foreground">Line total</span>
                              <span className="font-semibold text-foreground">
                                {formatPriceLabel(
                                  item.unit_price * item.quantity,
                                  item.currency,
                                )}
                              </span>
                            </div>
                            <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                              <span className="text-muted-foreground">Selected</span>
                              <span className="font-medium text-foreground">
                                {item.quantity} / {item.max_per_order}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="rounded-full"
                              onClick={() =>
                                void updateCartItemQuantity(
                                  item.ticket_type_id,
                                  item.session_id,
                                  item.quantity - 1,
                                ).catch((error) => {
                                  toast.error("Unable to update quantity", {
                                    description:
                                      error instanceof Error
                                        ? error.message
                                        : "Please try again.",
                                  });
                                })
                              }
                            >
                              <Minus className="size-4" />
                            </Button>
                            <span className="min-w-8 text-center text-sm font-medium text-foreground">
                              {item.quantity}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="rounded-full"
                              onClick={() =>
                                void updateCartItemQuantity(
                                  item.ticket_type_id,
                                  item.session_id,
                                  item.quantity + 1,
                                ).catch((error) => {
                                  toast.error("Unable to update quantity", {
                                    description:
                                      error instanceof Error
                                        ? error.message
                                        : "Please try again.",
                                  });
                                })
                              }
                            >
                              <Plus className="size-4" />
                            </Button>
                          </div>
                          <p className="text-right text-xs text-muted-foreground">
                            You can add up to {item.max_per_order} for this ticket.
                          </p>
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              className="rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() =>
                                void removeCartItem(
                                  item.ticket_type_id,
                                  item.session_id,
                                ).catch((error) => {
                                  toast.error("Unable to remove ticket", {
                                    description:
                                      error instanceof Error
                                        ? error.message
                                        : "Please try again.",
                                  });
                                })
                              }
                            >
                              <Trash2 className="size-4" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <aside className="rounded-[1.75rem] border border-border/70 bg-card/90 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Order summary
            </p>
            <div className="mt-4 rounded-[1.35rem] border border-border/70 bg-background/70 p-5">
              <p className="text-sm font-medium text-foreground">Buyer details</p>
              <div className="mt-4 space-y-3">
                <Input
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  onBlur={() =>
                    setTouchedBuyerFields((current) => ({ ...current, name: true }))
                  }
                  placeholder="Full name"
                  aria-invalid={shouldShowNameError ? "true" : "false"}
                />
                {shouldShowNameError ? (
                  <p className="text-sm text-destructive">{buyerNameError}</p>
                ) : null}
                <Input
                  type="email"
                  value={customerEmail}
                  onChange={(event) => setCustomerEmail(event.target.value)}
                  onBlur={() =>
                    setTouchedBuyerFields((current) => ({ ...current, email: true }))
                  }
                  placeholder="Email address"
                  aria-invalid={shouldShowEmailError ? "true" : "false"}
                />
                {shouldShowEmailError ? (
                  <p className="text-sm text-destructive">{buyerEmailError}</p>
                ) : null}
              </div>
            </div>
            <div className="mt-4 rounded-[1.35rem] border border-border/70 bg-background/70 p-5">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Ticket lines</span>
                <span>{distinctTickets}</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                <span>Total tickets</span>
                <span>{totalItems}</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatPriceLabel(subtotal, currency)}</span>
              </div>
              <div className="mt-4 border-t border-border/70 pt-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">Total</span>
                  <span className="font-serif text-2xl font-semibold text-foreground">
                    {formatPriceLabel(subtotal, currency)}
                  </span>
                </div>
              </div>
            </div>

            <Button
              size="lg"
              className="mt-5 w-full rounded-full"
              disabled={isContinueDisabled}
              onClick={() => void handleContinueToPayment()}
            >
              {isCreatingOrder
                ? "Preparing payment"
                : session
                  ? "Continue to payment"
                  : "Login to continue"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="mt-3 w-full rounded-full bg-background"
              onClick={() => {
                void clearCart().catch((error) => {
                  toast.error("Unable to clear cart", {
                    description:
                      error instanceof Error
                        ? error.message
                        : "Please try again.",
                  });
                });
              }}
            >
              Clear cart
            </Button>
          </aside>
        </section>
      )}

      {savedTickets.items.length > 0 ? (
        <section className="mt-8 rounded-[1.75rem] border border-border/70 bg-card/90 p-5 shadow-sm">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Saved for later
              </p>
              <h2 className="mt-2 font-serif text-2xl font-semibold text-foreground">
                Keep these for another checkout
              </h2>
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {savedTickets.items.map((item) => (
              <article
                key={`${item.event_id}-${item.session_id}`}
                className="rounded-[1.35rem] border border-border/70 bg-background/70 p-4"
              >
                <p className="text-sm font-semibold text-foreground">
                  {item.event_title}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {formatDateRangeLabel(item.session_starts_at, item.session_ends_at)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatTimeRangeLabel(item.session_starts_at, item.session_ends_at)}
                </p>
                <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                  {item.selections.map((selection) => (
                    <p key={selection.ticket_type_id}>
                      {selection.quantity} x {selection.ticket_type_name}
                    </p>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    className="rounded-full"
                    onClick={() =>
                      void moveSavedSelectionToCart(
                        item.event_id,
                        item.session_id,
                      )
                        .then(() => {
                          toast.success("Saved tickets moved to cart", {
                            description:
                              "They are now reserved for 10 minutes.",
                          });
                        })
                        .catch((error) => {
                          toast.error("Unable to move saved tickets", {
                            description:
                              error instanceof Error
                                ? error.message
                                : "Please try again.",
                          });
                        })
                    }
                  >
                    Move to cart
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full bg-background"
                    onClick={() =>
                      removeSavedTicketSelection(item.event_id, item.session_id)
                    }
                  >
                    Remove
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <AlertDialog open={isLoginPromptOpen} onOpenChange={setIsLoginPromptOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Login required</AlertDialogTitle>
            <AlertDialogDescription>
              You need to sign in before you can continue to payment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not now</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                navigate({
                  to: "/login",
                })
              }
            >
              Go to login
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
