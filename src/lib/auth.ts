import { useEffect, useState } from "react";

import { apiClient, createApiClient } from "#/lib/api/client";
import type { components } from "#/lib/api/generated/schema";

export type AuthResult = components["schemas"]["AuthResult"];
export type Profile = components["schemas"]["Profile"];

export type AuthSession = {
  access_token: string;
  access_expires_at: string;
  refresh_token: string;
  refresh_expires_at: string;
  user: Profile;
};

const AUTH_STORAGE_KEY = "eventy.auth.session";
const AUTH_EVENT_NAME = "eventy-auth-changed";
const ACCESS_TOKEN_REFRESH_BUFFER_MS = 60_000;

let refreshPromise: Promise<AuthSession | null> | null = null;

function isBrowser() {
  return typeof window !== "undefined";
}

function isSessionShape(value: unknown): value is AuthSession {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<AuthSession>;
  return (
    typeof candidate.access_token === "string" &&
    typeof candidate.access_expires_at === "string" &&
    typeof candidate.refresh_token === "string" &&
    typeof candidate.refresh_expires_at === "string" &&
    Boolean(candidate.user)
  );
}

function getExpiryTime(value?: string) {
  if (!value) {
    return Number.NaN;
  }

  return new Date(value).getTime();
}

function isExpired(value?: string) {
  const expiryTime = getExpiryTime(value);
  return Number.isNaN(expiryTime) || expiryTime <= Date.now();
}

function shouldRefreshAccessToken(session: AuthSession) {
  const expiryTime = getExpiryTime(session.access_expires_at);

  if (Number.isNaN(expiryTime)) {
    return true;
  }

  return expiryTime - Date.now() <= ACCESS_TOKEN_REFRESH_BUFFER_MS;
}

function emitAuthChange() {
  if (!isBrowser()) {
    return;
  }

  window.dispatchEvent(new Event(AUTH_EVENT_NAME));
}

function normalizeSession(session: AuthResult | AuthSession) {
  return session as AuthSession;
}

export function getAuthSession(): AuthSession | null {
  if (!isBrowser()) {
    return null;
  }

  const rawValue = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;

    if (!isSessionShape(parsed)) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function saveAuthSession(session: AuthResult | AuthSession) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify(normalizeSession(session)),
  );
  emitAuthChange();
}

export function updateAuthSessionUser(user: Profile) {
  const session = getAuthSession();

  if (!session) {
    return;
  }

  saveAuthSession({
    ...session,
    user,
  });
}

export function clearAuthSession() {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  emitAuthChange();
}

async function refreshSessionRequest(refreshToken: string) {
  const { data, error } = await apiClient.POST("/v1/auth/refresh", {
    body: {
      refresh_token: refreshToken,
    },
  });

  if (error || !data || !("access_token" in data)) {
    throw new Error(error?.message ?? "Failed to refresh session");
  }

  return normalizeSession(data);
}

export async function refreshAuthSession() {
  const currentSession = getAuthSession();

  if (!currentSession || isExpired(currentSession.refresh_expires_at)) {
    clearAuthSession();
    return null;
  }

  if (!refreshPromise) {
    refreshPromise = refreshSessionRequest(currentSession.refresh_token)
      .then((nextSession) => {
        saveAuthSession(nextSession);
        return nextSession;
      })
      .catch(() => {
        clearAuthSession();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

export async function getValidAccessToken() {
  const session = getAuthSession();

  if (!session) {
    return null;
  }

  if (!shouldRefreshAccessToken(session)) {
    return session.access_token;
  }

  const refreshedSession = await refreshAuthSession();
  return refreshedSession?.access_token ?? null;
}

export async function loadCurrentUser() {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    clearAuthSession();
    throw new Error("invalid or expired token");
  }

  const client = createApiClient(accessToken);
  const { data, error, response } = await client.GET("/v1/users/me");

  if (error || !data || !("email" in data)) {
    if (response.status === 401) {
      clearAuthSession();
    }

    throw new Error(error?.message ?? "Failed to load current user");
  }

  updateAuthSessionUser(data);
  return data;
}

export async function hydrateAuthSession() {
  const session = getAuthSession();

  if (!session) {
    return null;
  }

  try {
    await getValidAccessToken();
    await loadCurrentUser();
    return getAuthSession();
  } catch {
    return getAuthSession();
  }
}

export function useAuthSession() {
  const [session, setSession] = useState<AuthSession | null>(() =>
    getAuthSession(),
  );

  useEffect(() => {
    function syncSession() {
      setSession(getAuthSession());
    }

    syncSession();
    window.addEventListener("storage", syncSession);
    window.addEventListener(AUTH_EVENT_NAME, syncSession);

    return () => {
      window.removeEventListener("storage", syncSession);
      window.removeEventListener(AUTH_EVENT_NAME, syncSession);
    };
  }, []);

  return session;
}
