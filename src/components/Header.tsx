import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import {
  CalendarDays,
  Check,
  ChevronDown,
  CircleUserRound,
  KeyRound,
  LogOut,
  Settings,
  ShieldCheck,
  Ticket,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { logout } from "#/lib/api/auth";
import {
  canAccessAdminApp,
  isAdminRole,
  isSuperAdminSession,
} from "#/features/admin/auth";
import { clearAuthSession, useAuthSession } from "#/lib/auth";
import {
  formatDateRangeLabel,
  formatPriceLabel,
  formatTimeRangeLabel,
} from "#/features/events/display";
import {
  getCartSubtotal,
  removeCartItem,
  useCart,
  useReservationCountdown,
} from "#/lib/cart";
import { DEFAULT_CURRENCY_CODE } from "#/lib/currency";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
  const navigate = useNavigate();
  const session = useAuthSession();
  const cart = useCart();
  const countdown = useReservationCountdown(cart.expires_at);
  const cartItemsCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = getCartSubtotal(cart.items);
  const cartCurrency = cart.items[0]?.currency ?? DEFAULT_CURRENCY_CODE;
  const [isCartOpen, setIsCartOpen] = useState(false);

  const logoutMutation = useMutation({
    mutationFn: async () => {
      if (!session) {
        return;
      }

      await logout(session.refresh_token);
    },
    onSettled: () => {
      clearAuthSession();
      void navigate({ to: "/" });
    },
  });

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/80 px-4 backdrop-blur-xl">
      <div className="border-b border-border/50 bg-card/45">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 py-2 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="size-3.5 text-primary" />
              Secure checkout
            </span>
            <span className="inline-flex items-center gap-2">
              <Ticket className="size-3.5 text-primary" />
              Instant e-ticket delivery
            </span>
          </div>
        </div>
      </div>

      <nav className="mx-auto grid max-w-7xl gap-3 py-3 sm:py-4 lg:grid-cols-[auto_1fr_auto] lg:items-center">
        <h2 className="m-0 text-base font-semibold tracking-tight">
          <Link
            to="/"
            className="inline-flex items-center gap-3 rounded-full border border-border/70 bg-card/90 px-3 py-2 text-sm text-foreground no-underline shadow-[0_18px_40px_-24px_color-mix(in_oklab,var(--foreground)_30%,transparent)] transition-all hover:-translate-y-0.5 hover:bg-card sm:px-4"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-primary via-primary to-accent text-xs font-black tracking-[0.2em] text-primary-foreground shadow-sm">
              E
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-[0.72rem] uppercase tracking-[0.24em] text-muted-foreground">
                Eventy
              </span>
              <span className="text-sm font-semibold text-foreground">
                Tickets for what matters
              </span>
            </span>
          </Link>
        </h2>

        <div className="order-3 flex w-full flex-wrap items-center gap-2 rounded-[1.75rem] border border-border/70 bg-card/75 p-1 lg:order-2 lg:w-fit lg:justify-self-center">
          <Link
            to="/"
            className="inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground no-underline transition-colors hover:text-foreground"
            activeProps={{
              className:
                "inline-flex items-center rounded-full bg-background px-4 py-2 text-sm font-semibold text-foreground no-underline shadow-sm",
            }}
          >
            Home
          </Link>
          <Link
            to="/events"
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground no-underline transition-colors hover:text-foreground"
            activeProps={{
              className:
                "inline-flex items-center gap-2 rounded-full bg-background px-4 py-2 text-sm font-semibold text-foreground no-underline shadow-sm",
            }}
          >
            <CalendarDays className="size-4" />
            All Events
          </Link>
        </div>

        <div className="order-2 flex flex-wrap items-center justify-end gap-2 lg:order-3">
          <Popover open={isCartOpen} onOpenChange={setIsCartOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="rounded-full">
                <Ticket className="size-4" />
                Cart
                {cartItemsCount > 0 ? (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                    {cartItemsCount}
                  </span>
                ) : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[24rem] rounded-3xl p-0">
              <div className="border-b border-border/70 px-5 py-4">
                <p className="text-sm font-semibold text-foreground">Your cart</p>
                <p className="text-sm text-muted-foreground">
                  {cartItemsCount > 0
                    ? `${cartItemsCount} ticket${cartItemsCount === 1 ? "" : "s"} selected`
                    : "No tickets selected yet"}
                </p>
                {cartItemsCount > 0 && cart.expires_at ? (
                  <p className="mt-2 text-xs text-primary">
                    Held for {countdown.formatted}
                  </p>
                ) : null}
              </div>
              <div className="max-h-96 space-y-3 overflow-y-auto p-3">
                {cart.items.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/70 bg-background/60 p-4 text-sm text-muted-foreground">
                    Browse an event, choose tickets, and your checkout panel will appear here.
                  </div>
                ) : (
                  cart.items.map((item) => (
                    <div
                      key={`${item.session_id}-${item.ticket_type_id}`}
                      className="rounded-2xl border border-border/70 bg-background/70 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {item.ticket_type_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.event_title}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
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
                        </Button>
                      </div>
                      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                        <p>
                          {formatDateRangeLabel(
                            item.session_starts_at,
                            item.session_ends_at,
                          )}
                        </p>
                        <p>
                          {formatTimeRangeLabel(
                            item.session_starts_at,
                            item.session_ends_at,
                          )}
                        </p>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {item.quantity} x {formatPriceLabel(item.unit_price, item.currency)}
                        </span>
                        <span className="font-medium text-foreground">
                          {formatPriceLabel(
                            item.unit_price * item.quantity,
                            item.currency,
                          )}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="border-t border-border/70 p-3">
                <div className="mb-3 flex items-center justify-between px-2 text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium text-foreground">
                    {formatPriceLabel(cartSubtotal, cartCurrency)}
                  </span>
                </div>
                <Button
                  asChild
                  className="w-full rounded-full"
                  disabled={cart.items.length === 0}
                >
                  <Link to="/checkout" onClick={() => setIsCartOpen(false)}>
                    <Check className="size-4" />
                    Go to checkout
                  </Link>
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {session ? (
            <>
              {canAccessAdminApp(session) ? (
                <Button asChild variant="outline" className="rounded-full">
                  <Link to="/admin">
                    {isSuperAdminSession(session)
                      ? "Admin workspace"
                      : "Organizer workspace"}
                  </Link>
                </Button>
              ) : null}
              {isAdminRole(session.user.role) ? (
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  disabled={logoutMutation.isPending}
                  onClick={() => logoutMutation.mutate()}
                >
                  <LogOut className="size-4" />
                  {logoutMutation.isPending ? "Signing out" : "Logout"}
                </Button>
              ) : (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="rounded-full">
                      <CircleUserRound className="size-4" />
                      {session.user.name.split(" ")[0] ?? "Account"}
                      <ChevronDown className="size-4 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-80 rounded-3xl p-0">
                    <div className="border-b border-border/70 px-5 py-4">
                      <p className="text-sm font-semibold text-foreground">
                        {session.user.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {session.user.email}
                      </p>
                    </div>
                    <div className="space-y-1 p-3">
                      <Button
                        asChild
                        variant="ghost"
                        className="h-11 w-full justify-start rounded-2xl"
                      >
                        <Link to="/account/profile">
                          <Settings className="size-4" />
                          Update profile
                        </Link>
                      </Button>
                      <Button
                        asChild
                        variant="ghost"
                        className="h-11 w-full justify-start rounded-2xl"
                      >
                        <Link to="/account/security">
                          <KeyRound className="size-4" />
                          Change password
                        </Link>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-11 w-full justify-start rounded-2xl text-destructive hover:bg-destructive/5 hover:text-destructive"
                        disabled={logoutMutation.isPending}
                        onClick={() => logoutMutation.mutate()}
                      >
                        <LogOut className="size-4" />
                        {logoutMutation.isPending ? "Signing out" : "Logout"}
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </>
          ) : (
            <>
              <Button asChild variant="ghost" className="rounded-full px-4">
                <Link to="/login">Login</Link>
              </Button>
              <Button asChild className="rounded-full">
                <Link to="/register">Create account</Link>
              </Button>
            </>
          )}

          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
