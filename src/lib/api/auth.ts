import { API_BASE_URL, apiClient, createApiClient } from "#/lib/api/client";
import {
  authenticatedFetch,
  loadCurrentUser,
  refreshAuthSession,
} from "#/lib/auth";
import type { components } from "#/lib/api/generated/schema";

type ApiErrorPayload = {
  message?: string;
};

async function parseApiResponse<T>(response: Response, fallbackMessage: string) {
  const payload = (await response.json().catch(() => null)) as
    | T
    | ApiErrorPayload
    | null;

  if (!response.ok) {
    throw new Error(
      (payload as ApiErrorPayload | null)?.message ?? fallbackMessage,
    );
  }

  if (!payload) {
    throw new Error(fallbackMessage);
  }

  return payload as T;
}

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

export async function register(input: { name: string; email: string; password: string }) {
  const response = await fetch(`${API_BASE_URL}/v1/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return parseApiResponse<{ message: string }>(
    response,
    "Failed to create account",
  );
}

export async function resendRegisterOtp(input: { email: string }) {
  const response = await fetch(`${API_BASE_URL}/v1/auth/register/resend-otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return parseApiResponse<{ message: string }>(
    response,
    "Failed to resend OTP",
  );
}

export async function verifyRegisterOtp(input: { email: string; otp: string }) {
  const response = await fetch(`${API_BASE_URL}/v1/auth/register/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return parseApiResponse<components["schemas"]["AuthResult"]>(
    response,
    "Failed to verify OTP",
  );
}

export async function forgotPassword(input: { email: string }) {
  const response = await fetch(`${API_BASE_URL}/v1/auth/forgot-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return parseApiResponse<{ message: string }>(
    response,
    "Failed to start password reset",
  );
}

export async function resetPassword(input: {
  email: string;
  token: string;
  new_password: string;
}) {
  const response = await fetch(`${API_BASE_URL}/v1/auth/reset-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return parseApiResponse<{ message: string }>(
    response,
    "Failed to reset password",
  );
}

export async function changePassword(input: {
  current_password: string;
  new_password: string;
}) {
  const response = await authenticatedFetch(`${API_BASE_URL}/v1/auth/change-password`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return parseApiResponse<{ message: string }>(
    response,
    "Failed to update password",
  );
}

export async function updateProfile(input: { name: string; email: string }) {
  const response = await authenticatedFetch(`${API_BASE_URL}/v1/users/me`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return parseApiResponse<components["schemas"]["Profile"]>(
    response,
    "Failed to update profile",
  );
}

export async function deleteProfile(input: { current_password: string }) {
  const response = await authenticatedFetch(`${API_BASE_URL}/v1/users/me`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (response.status === 204) {
    return;
  }

  await parseApiResponse<{ message: string }>(
    response,
    "Failed to delete account",
  );
}
