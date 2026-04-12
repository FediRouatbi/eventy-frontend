import { useEffect, useMemo, useRef, useState } from "react";

import {
  deleteReservation,
  getReservation,
  type ReservationItemPayload,
  type ReservationPayload,
  upsertReservation,
} from "#/lib/api/reservations";
import { queryClient } from "#/lib/query-client";

const CART_STORAGE_KEY = "eventy-cart";
const SAVED_TICKETS_STORAGE_KEY = "eventy-saved-tickets";

export type CartItem = ReservationItemPayload;

export type SavedTicketSelection = {
  event_id: string;
  event_title: string;
  session_id: string;
  session_starts_at: string;
  session_ends_at?: string | null;
  selections: Array<{
    ticket_type_id: string;
    ticket_type_name: string;
    quantity: number;
    unit_price: number;
    currency: string;
    max_per_order: number;
    available_quantity: number;
  }>;
};

type CartSnapshot = {
  reservation_id?: string;
  reservation_token?: string;
  expires_at?: string;
  items: CartItem[];
};

type SavedTicketsSnapshot = {
  items: SavedTicketSelection[];
};

function getDefaultCart(): CartSnapshot {
  return { items: [] };
}

function getDefaultSavedTickets(): SavedTicketsSnapshot {
  return { items: [] };
}

function canUseStorage() {
  return typeof window !== "undefined";
}

function isExpired(expiresAt?: string) {
  if (!expiresAt) {
    return false;
  }

  return new Date(expiresAt).getTime() <= Date.now();
}

function normalizeReservation(reservation: ReservationPayload): CartSnapshot {
  return {
    reservation_id: reservation.id,
    reservation_token: reservation.token,
    expires_at: reservation.expires_at,
    items: reservation.items ?? [],
  };
}

export function readCart(): CartSnapshot {
  if (!canUseStorage()) {
    return getDefaultCart();
  }

  try {
    const rawValue = window.localStorage.getItem(CART_STORAGE_KEY);

    if (!rawValue) {
      return getDefaultCart();
    }

    const parsed = JSON.parse(rawValue) as CartSnapshot;
    const snapshot = {
      reservation_id: parsed?.reservation_id,
      reservation_token: parsed?.reservation_token,
      expires_at: parsed?.expires_at,
      items: Array.isArray(parsed?.items) ? parsed.items : [],
    };

    if (isExpired(snapshot.expires_at)) {
      window.localStorage.removeItem(CART_STORAGE_KEY);
      return getDefaultCart();
    }

    return snapshot;
  } catch {
    return getDefaultCart();
  }
}

export function readSavedTickets(): SavedTicketsSnapshot {
  if (!canUseStorage()) {
    return getDefaultSavedTickets();
  }

  try {
    const rawValue = window.localStorage.getItem(SAVED_TICKETS_STORAGE_KEY);

    if (!rawValue) {
      return getDefaultSavedTickets();
    }

    const parsed = JSON.parse(rawValue) as SavedTicketsSnapshot;
    return {
      items: Array.isArray(parsed?.items) ? parsed.items : [],
    };
  } catch {
    return getDefaultSavedTickets();
  }
}

function emitCartChange() {
  if (!canUseStorage()) {
    return;
  }

  window.dispatchEvent(new Event("eventy-cart-change"));
}

function emitSavedTicketsChange() {
  if (!canUseStorage()) {
    return;
  }

  window.dispatchEvent(new Event("eventy-saved-tickets-change"));
}

function writeCart(nextCart: CartSnapshot) {
  if (!canUseStorage()) {
    return;
  }

  if (nextCart.items.length === 0) {
    window.localStorage.removeItem(CART_STORAGE_KEY);
  } else {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(nextCart));
  }

  emitCartChange();
  void queryClient.invalidateQueries({ queryKey: ["public"] });
}

function writeSavedTickets(nextSavedTickets: SavedTicketsSnapshot) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(
    SAVED_TICKETS_STORAGE_KEY,
    JSON.stringify(nextSavedTickets),
  );
  emitSavedTicketsChange();
}

function mergeCartItems(items: CartItem[], additions: CartItem[]) {
  const nextItems = [...items];

  for (const item of additions) {
    const existingIndex = nextItems.findIndex(
      (existingItem) =>
        existingItem.ticket_type_id === item.ticket_type_id &&
        existingItem.session_id === item.session_id,
    );

    if (existingIndex >= 0) {
      nextItems[existingIndex] = {
        ...nextItems[existingIndex],
        ...item,
        quantity: nextItems[existingIndex].quantity + item.quantity,
      };
      continue;
    }

    nextItems.push(item);
  }

  return nextItems;
}

async function replaceCartItems(items: CartItem[]) {
  const currentCart = readCart();
  const normalizedItems = items
    .map((item) => ({
      ...item,
      quantity: Math.max(0, Math.floor(item.quantity)),
    }))
    .filter((item) => item.quantity > 0);

  if (normalizedItems.length === 0) {
    await clearCart();
    return getDefaultCart();
  }

  try {
    const reservation = await upsertReservation({
      reservation_id: currentCart.reservation_id,
      reservation_token: currentCart.reservation_token,
      items: normalizedItems.map((item) => ({
        ticket_type_id: item.ticket_type_id,
        quantity: item.quantity,
      })),
    });

    const nextCart = normalizeReservation(reservation);
    writeCart(nextCart);
    return nextCart;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (
      currentCart.reservation_id &&
      currentCart.reservation_token &&
      message.toLowerCase().includes("not found")
    ) {
      const reservation = await upsertReservation({
        items: normalizedItems.map((item) => ({
          ticket_type_id: item.ticket_type_id,
          quantity: item.quantity,
        })),
      });

      const nextCart = normalizeReservation(reservation);
      writeCart(nextCart);
      return nextCart;
    }

    throw error;
  }
}

export async function syncCartWithReservation() {
  const currentCart = readCart();

  if (!currentCart.reservation_id || !currentCart.reservation_token) {
    return currentCart;
  }

  if (isExpired(currentCart.expires_at)) {
    writeCart(getDefaultCart());
    return getDefaultCart();
  }

  try {
    const reservation = await getReservation(
      currentCart.reservation_id,
      currentCart.reservation_token,
    );
    const nextCart = normalizeReservation(reservation);
    writeCart(nextCart);
    return nextCart;
  } catch {
    writeCart(getDefaultCart());
    return getDefaultCart();
  }
}

export async function addItemsToCart(items: CartItem[]) {
  const currentCart = readCart();
  return replaceCartItems(mergeCartItems(currentCart.items, items));
}

export async function updateCartItemQuantity(
  ticketTypeId: string,
  sessionId: string,
  quantity: number,
) {
  const currentCart = readCart();
  const nextItems = currentCart.items
    .map((item) => {
      if (
        item.ticket_type_id !== ticketTypeId ||
        item.session_id !== sessionId
      ) {
        return item;
      }

      return {
        ...item,
        quantity,
      };
    })
    .filter((item) => item.quantity > 0);

  return replaceCartItems(nextItems);
}

export async function removeCartItem(ticketTypeId: string, sessionId: string) {
  const currentCart = readCart();
  return replaceCartItems(
    currentCart.items.filter(
      (item) =>
        !(
          item.ticket_type_id === ticketTypeId && item.session_id === sessionId
        ),
    ),
  );
}

export async function clearCart() {
  const currentCart = readCart();

  if (currentCart.reservation_id && currentCart.reservation_token) {
    try {
      await deleteReservation(
        currentCart.reservation_id,
        currentCart.reservation_token,
      );
    } catch {
      // Keep local cleanup resilient even if backend release fails.
    }
  }

  writeCart(getDefaultCart());
}

export function saveTicketSelection(selection: SavedTicketSelection) {
  const current = readSavedTickets();
  const nextItems = current.items.filter(
    (item) =>
      !(
        item.event_id === selection.event_id &&
        item.session_id === selection.session_id
      ),
  );
  nextItems.push(selection);
  writeSavedTickets({ items: nextItems });
}

export function removeSavedTicketSelection(eventId: string, sessionId: string) {
  const current = readSavedTickets();
  writeSavedTickets({
    items: current.items.filter(
      (item) => !(item.event_id === eventId && item.session_id === sessionId),
    ),
  });
}

export async function moveSavedSelectionToCart(eventId: string, sessionId: string) {
  const current = readSavedTickets();
  const target = current.items.find(
    (item) => item.event_id === eventId && item.session_id === sessionId,
  );

  if (!target) {
    return readCart();
  }

  const nextCart = await addItemsToCart(
    target.selections.map((selection) => ({
      ticket_type_id: selection.ticket_type_id,
      ticket_type_name: selection.ticket_type_name,
      quantity: selection.quantity,
      unit_price: selection.unit_price,
      currency: selection.currency,
      event_id: target.event_id,
      event_title: target.event_title,
      session_id: target.session_id,
      session_starts_at: target.session_starts_at,
      session_ends_at: target.session_ends_at,
      max_per_order: selection.max_per_order,
      available_quantity: selection.available_quantity,
    })),
  );

  removeSavedTicketSelection(eventId, sessionId);
  return nextCart;
}

export function useCart() {
  const [cart, setCart] = useState<CartSnapshot>(() => readCart());
  const isSyncingRef = useRef(false);

  useEffect(() => {
    function syncCart() {
      setCart(readCart());
    }

    syncCart();
    void syncCartWithReservation();

    window.addEventListener("storage", syncCart);
    window.addEventListener("eventy-cart-change", syncCart);

    return () => {
      window.removeEventListener("storage", syncCart);
      window.removeEventListener("eventy-cart-change", syncCart);
    };
  }, []);

  useEffect(() => {
    if (!cart.reservation_id || !cart.reservation_token) {
      return;
    }

    const sync = async () => {
      if (isSyncingRef.current) {
        return;
      }

      isSyncingRef.current = true;
      try {
        await syncCartWithReservation();
      } finally {
        isSyncingRef.current = false;
      }
    };

    void sync();

    const poll = window.setInterval(() => {
      void sync();
    }, 5000);

    window.addEventListener("focus", sync);

    return () => {
      window.clearInterval(poll);
      window.removeEventListener("focus", sync);
    };
  }, [cart.reservation_id, cart.reservation_token]);

  return cart;
}

export function useSavedTickets() {
  const [savedTickets, setSavedTickets] = useState<SavedTicketsSnapshot>(() =>
    readSavedTickets(),
  );

  useEffect(() => {
    function syncSavedTickets() {
      setSavedTickets(readSavedTickets());
    }

    syncSavedTickets();
    window.addEventListener("storage", syncSavedTickets);
    window.addEventListener("eventy-saved-tickets-change", syncSavedTickets);

    return () => {
      window.removeEventListener("storage", syncSavedTickets);
      window.removeEventListener("eventy-saved-tickets-change", syncSavedTickets);
    };
  }, []);

  return savedTickets;
}

export function getCartSubtotal(items: CartItem[]) {
  return items.reduce(
    (total, item) => total + item.unit_price * item.quantity,
    0,
  );
}

export function useReservationCountdown(expiresAt?: string) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!expiresAt) {
      return;
    }

    setNow(Date.now());
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [expiresAt]);

  return useMemo(() => {
    const remainingMs = expiresAt
      ? Math.max(new Date(expiresAt).getTime() - now, 0)
      : 0;
    const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return {
      remainingMs,
      formatted: `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`,
      expired: Boolean(expiresAt) && remainingMs <= 0,
    };
  }, [expiresAt, now]);
}
