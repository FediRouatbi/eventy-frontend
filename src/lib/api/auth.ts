import { API_BASE_URL, apiClient, createApiClient } from "#/lib/api/client";
import {
  authenticatedFetch,
  loadCurrentUser,
  refreshAuthSession,
} from "#/lib/auth";
import type { components } from "#/lib/api/generated/schema";

export async function login(input: components["schemas"]["LoginInput"]) {
  const { data, error } = await apiClient.POST("/v1/auth/login", {
    body: input,
  });

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to sign in");
  }

  return data;
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

export async function logout(refreshToken: string) {
  const response = await authenticatedFetch(`${API_BASE_URL}/v1/auth/logout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      message?: string;
      error?: string;
    } | null;

    throw new Error(payload?.message ?? "Failed to sign out");
  }
}
