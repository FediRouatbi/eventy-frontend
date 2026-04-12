import { useEffect, useState } from "react";

const ORDER_HISTORY_KEY = "eventy-order-history";
const MAX_ITEMS = 10;

type OrderHistorySnapshot = {
  stripe_session_ids: string[];
};

function canUseStorage() {
  return typeof window !== "undefined";
}

export function readOrderHistory(): OrderHistorySnapshot {
  if (!canUseStorage()) {
    return { stripe_session_ids: [] };
  }

  try {
    const rawValue = window.localStorage.getItem(ORDER_HISTORY_KEY);
    if (!rawValue) {
      return { stripe_session_ids: [] };
    }

    const parsed = JSON.parse(rawValue) as Partial<OrderHistorySnapshot> | null;
    const ids = Array.isArray(parsed?.stripe_session_ids)
      ? parsed!.stripe_session_ids.filter((id): id is string => typeof id === "string")
      : [];

    return { stripe_session_ids: ids };
  } catch {
    return { stripe_session_ids: [] };
  }
}

export function rememberStripeCheckoutSession(stripeSessionId: string) {
  const normalized = String(stripeSessionId ?? "").trim();
  if (!normalized || !canUseStorage()) {
    return;
  }

  const snapshot = readOrderHistory();
  const nextItems = [normalized, ...snapshot.stripe_session_ids.filter((id) => id !== normalized)].slice(
    0,
    MAX_ITEMS,
  );

  window.localStorage.setItem(
    ORDER_HISTORY_KEY,
    JSON.stringify({ stripe_session_ids: nextItems }),
  );
  window.dispatchEvent(new Event("eventy-order-history-change"));
}

export function useOrderHistory() {
  const [snapshot, setSnapshot] = useState(() => readOrderHistory());

  useEffect(() => {
    function sync() {
      setSnapshot(readOrderHistory());
    }

    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("eventy-order-history-change", sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("eventy-order-history-change", sync);
    };
  }, []);

  return snapshot;
}
