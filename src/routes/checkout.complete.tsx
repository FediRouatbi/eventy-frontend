import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/checkout/complete")({
  validateSearch: normalizeCheckoutCompleteSearch,
  beforeLoad: ({ search, location }) => {
    const parsedSearch = normalizeCheckoutCompleteSearch(search);
    const rawSearch = parseRawSearch(location.searchStr);
    const sessionId = parsedSearch.session_id || rawSearch.session_id;
    const openApp = isMobileHandoff(parsedSearch.open_app || rawSearch.open_app)
      ? "mobile"
      : "";
    const successSearch = new URLSearchParams();

    if (sessionId) {
      successSearch.set("session_id", sessionId);
    }
    if (openApp) {
      successSearch.set("open_app", openApp);
    }

    throw redirect({
      href: `/checkout/success?${successSearch.toString()}`,
    });
  },
});

function normalizeCheckoutCompleteSearch(search: unknown) {
  const record =
    search && typeof search === "object"
      ? (search as Record<string, unknown>)
      : {};

  return {
    session_id: searchValueToString(record.session_id),
    open_app: searchValueToString(record.open_app),
  };
}

function parseRawSearch(searchStr: string) {
  const params = new URLSearchParams(searchStr.startsWith("?") ? searchStr : `?${searchStr}`);

  return {
    session_id: params.get("session_id") ?? "",
    open_app: params.get("open_app") ?? "",
  };
}

function searchValueToString(value: unknown) {
  if (typeof value === "string") {
    return parseStringSearchValue(value);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return "";
}

function parseStringSearchValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (typeof parsed === "string") {
      return parsed;
    }
    if (typeof parsed === "number" || typeof parsed === "boolean") {
      return String(parsed);
    }
  } catch {
    // Normal query strings are not JSON; keep the original value.
  }

  return trimmed;
}

function isMobileHandoff(value: string) {
  return value === "1" || value === "true" || value === "mobile";
}
