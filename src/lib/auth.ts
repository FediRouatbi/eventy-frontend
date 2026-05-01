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

const AUTH_EVENT_NAME = "eventy-auth-changed";
const ACCESS_TOKEN_REFRESH_BUFFER_MS = 60_000;

let refreshPromise: Promise<AuthSession | null> | null = null;
let hydratePromise: Promise<AuthSession | null> | null = null;
let authSession: AuthSession | null = null;
let authHydrating = false;

function isBrowser() {
  return typeof window !== "undefined";
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
  const nextSession = session as AuthSession;
  return {
    ...nextSession,
    refresh_token: "",
  };
}

export function getAuthSession(): AuthSession | null {
  return authSession;
}

export function isAuthHydrating() {
  return authHydrating;
}

export function saveAuthSession(session: AuthResult | AuthSession) {
  authSession = normalizeSession(session);
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
  authSession = null;
  emitAuthChange();
}

async function refreshSessionRequest() {
  const { data, error } = await apiClient.POST("/v1/auth/refresh");

  if (error || !data || !("access_token" in data)) {
    throw new Error(error?.message ?? "Failed to refresh session");
  }

  return normalizeSession(data);
}

export async function refreshAuthSession() {
  if (!isBrowser()) {
    return null;
  }

  if (!refreshPromise) {
    refreshPromise = refreshSessionRequest()
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
  let session = getAuthSession();

  if (!session) {
    session = await refreshAuthSession();
    if (!session) {
      return null;
    }
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
  if (!isBrowser()) {
    return null;
  }

  if (!hydratePromise) {
    authHydrating = true;
    emitAuthChange();
    hydratePromise = (async () => {
      const session = getAuthSession() ?? (await refreshAuthSession());
      if (!session) {
        return null;
      }

      try {
        await loadCurrentUser();
      } catch {
        return getAuthSession();
      }

      return getAuthSession();
    })().finally(() => {
      hydratePromise = null;
      authHydrating = false;
      emitAuthChange();
    });
  }

  return hydratePromise;
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
    window.addEventListener(AUTH_EVENT_NAME, syncSession);

    return () => {
      window.removeEventListener(AUTH_EVENT_NAME, syncSession);
    };
  }, []);

  return session;
}

export function useAuthHydrating() {
  const [isHydrating, setIsHydrating] = useState<boolean>(() =>
    isAuthHydrating(),
  );

  useEffect(() => {
    function syncHydration() {
      setIsHydrating(isAuthHydrating());
    }

    syncHydration();
    window.addEventListener(AUTH_EVENT_NAME, syncHydration);

    return () => {
      window.removeEventListener(AUTH_EVENT_NAME, syncHydration);
    };
  }, []);

  return isHydrating;
}
