import { Link } from "@tanstack/react-router";
import { CalendarDays, ShieldCheck, Sparkles, Ticket } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/80 px-4 backdrop-blur-xl">
      <div className="border-b border-border/50 bg-card/45">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 py-2 text-xs text-muted-foreground">
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
          <div className="hidden items-center gap-4 sm:flex">
            <span>Customer account area</span>
            <span>Organizer workspace</span>
          </div>
        </div>
      </div>

      <nav className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-3 py-3 sm:py-4">
        <h2 className="m-0 flex-shrink-0 text-base font-semibold tracking-tight">
          <Link
            to="/"
            className="inline-flex items-center gap-3 rounded-full border border-border/70 bg-card/90 px-3 py-1.5 text-sm text-foreground no-underline shadow-[0_18px_40px_-24px_color-mix(in_oklab,var(--foreground)_30%,transparent)] transition-all hover:-translate-y-0.5 hover:bg-card sm:px-4 sm:py-2"
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

        <div className="hidden items-center gap-2 rounded-full border border-border/70 bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground xl:flex">
          <Sparkles className="size-3.5 text-primary" />
          Category-first discovery with clearer booking and ticket trust
        </div>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
        </div>

        <div className="order-3 flex w-full flex-wrap items-center gap-x-5 gap-y-2 pb-1 text-sm font-semibold sm:order-2 sm:w-auto sm:flex-nowrap sm:pb-0">
          <Link
            to="/"
            className="inline-flex items-center rounded-full px-3 py-1.5 text-muted-foreground no-underline transition-colors hover:bg-secondary hover:text-foreground"
            activeProps={{
              className:
                "inline-flex items-center rounded-full bg-secondary px-3 py-1.5 text-secondary-foreground no-underline",
            }}
          >
            Home
          </Link>
          <Link
            to="/events"
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-muted-foreground no-underline transition-colors hover:bg-secondary hover:text-foreground"
            activeProps={{
              className:
                "inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-secondary-foreground no-underline",
            }}
          >
            <CalendarDays className="size-4" />
            All Events
          </Link>
        </div>
      </nav>
    </header>
  );
}
