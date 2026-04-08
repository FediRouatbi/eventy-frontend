export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 border-t border-border/70 bg-card/40 px-4 pb-14 pt-12 text-muted-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
        <div className="max-w-xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Eventy
          </p>
          <h2 className="font-serif text-3xl font-semibold text-foreground">
            A calmer, clearer way to discover and book live experiences.
          </h2>
          <p className="mt-4 text-sm leading-7">
            Eventy is being shaped around category discovery, fast booking,
            polished event pages, and a stronger organizer workflow.
          </p>
        </div>
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Browse
          </p>
          <div className="flex flex-col gap-3 text-sm">
            <a className="transition-colors hover:text-foreground" href="/events">
              All events
            </a>
            <a className="transition-colors hover:text-foreground" href="/#categories">
              Categories
            </a>
            <a className="transition-colors hover:text-foreground" href="/login">
              Customer account
            </a>
            <span className="text-muted-foreground">Secure checkout</span>
          </div>
        </div>
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Organizer
          </p>
          <div className="flex flex-col gap-3 text-sm">
            <a className="transition-colors hover:text-foreground" href="/admin">
              Organizer admin
            </a>
            <a className="transition-colors hover:text-foreground" href="/login">
              Sign in
            </a>
            <p className="text-sm leading-6">
              &copy; {year} Eventy. Built with TanStack Start and Bun.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
