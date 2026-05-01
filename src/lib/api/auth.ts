import { API_BASE_URL, apiClient, createApiClient } from "#/lib/api/client";
import { loadCurrentUser, refreshAuthSession } from "#/lib/auth";
import type { components } from "#/lib/api/generated/schema";
import { assertSuccess, unwrapData } from "./response";

export async function loginWithFirebaseIDToken(idToken: string) {
  const response = await fetch(`${API_BASE_URL}/v1/auth/firebase/login`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id_token: idToken,
      platform: "web",
    }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message ?? "Failed to sign in with Firebase");
  }

  return payload as components["schemas"]["AuthResult"];
}

export async function checkFirebaseEmailAvailability(email: string) {
  const response = await fetch(`${API_BASE_URL}/v1/auth/firebase/email-availability`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
    }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message ?? "Failed to verify email availability");
  }

  return payload as { available: boolean };
}

export async function refreshSession() {
  const session = await refreshAuthSession();

  if (!session) {
    throw new Error("Failed to refresh session");
  }

  return session;
}

export async function getMe(accessToken?: string) {
  if (accessToken) {
    const client = createApiClient(accessToken);
    const { data, error } = await client.GET("/v1/users/me");

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to load profile");
    }

    return data;
  }

  return loadCurrentUser();
}

export async function logout(accessToken?: string) {
  const client = accessToken ? createApiClient(accessToken) : apiClient;

  assertSuccess(
    await client.POST("/v1/auth/logout"),
    "Failed to sign out",
  );
}

export async function updateProfile(
  accessToken: string,
  input: components["schemas"]["UpdateProfileInput"],
) {
  const client = createApiClient(accessToken);
  return unwrapData(
    await client.PATCH("/v1/users/me", {
      body: input,
    }),
    "Failed to update profile",
  );
}

export async function deleteProfile(accessToken: string) {
  const client = createApiClient(accessToken);

  assertSuccess(
    await client.DELETE("/v1/users/me"),
    "Failed to delete account",
  );
}
