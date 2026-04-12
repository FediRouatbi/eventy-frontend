import { Link } from "@tanstack/react-router";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 border-t border-border/70 bg-card/40 px-4 pb-10 pt-12 text-muted-foreground">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-[1.25fr_0.8fr_0.8fr_0.9fr]">
          <div className="max-w-xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Eventy
            </p>
            <h2 className="font-serif text-3xl font-semibold text-foreground">
              Discover events, book faster, and manage plans in one place.
            </h2>
            <p className="mt-4 text-sm leading-7">
              Eventy helps people find the right live experience and checkout
              with more confidence.
            </p>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Explore
            </p>
            <div className="flex flex-col gap-3 text-sm">
              <Link className="transition-colors hover:text-foreground" to="/events">
                All events
              </Link>
              <Link className="transition-colors hover:text-foreground" to="/#categories">
                Categories
              </Link>
              <Link className="transition-colors hover:text-foreground" to="/events">
                Popular this week
              </Link>
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Account
            </p>
            <div className="flex flex-col gap-3 text-sm">
              <Link className="transition-colors hover:text-foreground" to="/login">
                Sign in
              </Link>
              <Link className="transition-colors hover:text-foreground" to="/register">
                Create account
              </Link>
              <Link className="transition-colors hover:text-foreground" to="/checkout">
                My checkout
              </Link>
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Organizers
            </p>
            <div className="flex flex-col gap-3 text-sm">
              <Link className="transition-colors hover:text-foreground" to="/admin">
                Organizer login
              </Link>
              <Link className="transition-colors hover:text-foreground" to="/support">
                Organizer help
              </Link>
              <Link className="transition-colors hover:text-foreground" to="/support">
                Contact support
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-border/70 pt-5 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {year} Eventy. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-4">
            <Link className="transition-colors hover:text-foreground" to="/support">
              Support
            </Link>
            <Link className="transition-colors hover:text-foreground" to="/privacy">
              Privacy
            </Link>
            <Link className="transition-colors hover:text-foreground" to="/terms">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
