import type {
  ApiCategory,
  ApiPublicEventDetail,
  ApiPublicEventWithSessions,
  ApiPublicSession,
} from "#/lib/api/public";

const categoryThemeBySlug: Record<
  string,
  { cardGradient: string; imageOverlay: string }
> = {
  concerts: {
    cardGradient: "from-emerald-500 via-teal-500 to-cyan-500",
    imageOverlay: "from-emerald-500/25 via-teal-400/20 to-transparent",
  },
  sports: {
    cardGradient: "from-orange-500 via-amber-400 to-yellow-300",
    imageOverlay: "from-orange-400/25 via-amber-300/20 to-transparent",
  },
  shows: {
    cardGradient: "from-fuchsia-500 via-rose-500 to-orange-300",
    imageOverlay: "from-fuchsia-500/25 via-rose-400/20 to-transparent",
  },
  cinema: {
    cardGradient: "from-sky-500 via-cyan-400 to-blue-300",
    imageOverlay: "from-sky-500/20 via-cyan-400/20 to-transparent",
  },
  festivals: {
    cardGradient: "from-violet-600 via-indigo-500 to-sky-400",
    imageOverlay: "from-violet-500/20 via-indigo-400/15 to-transparent",
  },
  professional: {
    cardGradient: "from-yellow-500 via-lime-400 to-emerald-400",
    imageOverlay: "from-yellow-400/25 via-lime-300/15 to-transparent",
  },
};

export function formatDateLabel(isoDateTime?: string | null) {
  if (!isoDateTime) {
    return "Upcoming soon";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(isoDateTime));
}

export function formatTimeLabel(isoDateTime?: string | null) {
  if (!isoDateTime) {
    return "Schedule to be announced";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(isoDateTime));
}

export function formatDateRangeLabel(
  startsAt?: string | null,
  endsAt?: string | null,
) {
  if (!startsAt) {
    return "Upcoming soon";
  }

  if (!endsAt) {
    return formatDateLabel(startsAt);
  }

  const startDate = new Date(startsAt);
  const endDate = new Date(endsAt);
  const sameDay =
    startDate.getFullYear() === endDate.getFullYear() &&
    startDate.getMonth() === endDate.getMonth() &&
    startDate.getDate() === endDate.getDate();

  return sameDay
    ? formatDateLabel(startsAt)
    : `${formatDateLabel(startsAt)} - ${formatDateLabel(endsAt)}`;
}

export function formatTimeRangeLabel(
  startsAt?: string | null,
  endsAt?: string | null,
) {
  if (!startsAt) {
    return "Schedule to be announced";
  }

  if (!endsAt) {
    return formatTimeLabel(startsAt);
  }

  return `${formatTimeLabel(startsAt)} - ${formatTimeLabel(endsAt)}`;
}

export function formatPriceLabel(price: number, currency: string) {
  const rounded = Number.isInteger(price) ? price.toFixed(0) : price.toFixed(2);
  return `${rounded} ${currency}`;
}

export function getCategoryTheme(categorySlug: string) {
  return (
    categoryThemeBySlug[categorySlug] ?? {
      cardGradient: "from-primary via-accent to-secondary",
      imageOverlay: "from-primary/20 via-accent/20 to-transparent",
    }
  );
}

export function sortSessionsByStart<
  T extends { starts_at: string | undefined | null },
>(sessions: T[]) {
  return [...sessions].sort(
    (left, right) =>
      new Date(left.starts_at ?? 0).getTime() -
      new Date(right.starts_at ?? 0).getTime(),
  );
}

export function getPrimarySession(event: ApiPublicEventWithSessions) {
  const sessions = sortSessionsByStart(event.sessions ?? []);
  return sessions[0];
}

export function getEventBannerImage(
  event:
    | Pick<ApiPublicEventWithSessions, "banner_url" | "poster_url">
    | Pick<ApiPublicEventDetail, "banner_url" | "poster_url">,
) {
  return event.banner_url || event.poster_url || "";
}

export function getEventPosterImage(
  event:
    | Pick<ApiPublicEventWithSessions, "banner_url" | "poster_url">
    | Pick<ApiPublicEventDetail, "banner_url" | "poster_url">,
) {
  return event.poster_url || event.banner_url || "";
}

export function countTicketsLeft(
  ticketTypes: ApiPublicEventDetail["sessions"][number]["ticket_types"] | null,
) {
  return (ticketTypes ?? []).reduce(
    (total, ticketType) => total + ticketType.quantity,
    0,
  );
}

export function getSessionPriceFrom(
  ticketTypes: ApiPublicEventDetail["sessions"][number]["ticket_types"] | null,
) {
  const safeTicketTypes = ticketTypes ?? [];

  if (safeTicketTypes.length === 0) {
    return 0;
  }

  return safeTicketTypes.reduce(
    (lowest, ticketType) => Math.min(lowest, ticketType.price),
    safeTicketTypes[0].price,
  );
}

export function normalizePublicSessions(
  sessions:
    | ApiPublicEventDetail["sessions"]
    | ApiPublicSession[]
    | null
    | undefined,
) {
  return (sessions ?? []).map((session) => ({
    ...session,
    ticket_types: session.ticket_types ?? [],
  }));
}

export function buildCategorySummaries(
  categories: ApiCategory[],
  events: ApiPublicEventWithSessions[],
) {
  return categories.map((category) => ({
    ...category,
    event_count: events.filter((event) => event.category_id === category.id)
      .length,
    theme: getCategoryTheme(category.slug),
  }));
}

export function groupEventsByOrganizer(events: ApiPublicEventWithSessions[]) {
  const grouped = new Map<
    string,
    { organizer_name: string; events: ApiPublicEventWithSessions[] }
  >();

  for (const event of events) {
    const existing = grouped.get(event.organizer_name);

    if (existing) {
      existing.events.push(event);
      continue;
    }

    grouped.set(event.organizer_name, {
      organizer_name: event.organizer_name,
      events: [event],
    });
  }

  return [...grouped.values()].sort(
    (left, right) =>
      right.events.length - left.events.length ||
      left.organizer_name.localeCompare(right.organizer_name),
  );
}

export function groupEventsByVenue(events: ApiPublicEventWithSessions[]) {
  const grouped = new Map<
    string,
    { venue_name: string; city: string; events: ApiPublicEventWithSessions[] }
  >();

  for (const event of events) {
    const key = `${event.venue_name}::${event.city}`;
    const existing = grouped.get(key);

    if (existing) {
      existing.events.push(event);
      continue;
    }

    grouped.set(key, {
      venue_name: event.venue_name,
      city: event.city,
      events: [event],
    });
  }

  return [...grouped.values()].sort(
    (left, right) =>
      right.events.length - left.events.length ||
      left.venue_name.localeCompare(right.venue_name),
  );
}
