import { apiClient, createApiClient } from "#/lib/api/client";
import { loadCurrentUser, refreshAuthSession } from "#/lib/auth";
import type { components } from "#/lib/api/generated/schema";

type ApiErrorShape = {
  message?: string;
  error?: string;
};

function getErrorMessage(payload: unknown, fallback: string) {
  if (
    payload &&
    typeof payload === "object" &&
    "message" in payload &&
    typeof (payload as { message?: unknown }).message === "string"
  ) {
    return (payload as { message: string }).message;
  }

  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof (payload as { error?: unknown }).error === "string"
  ) {
    return (payload as { error: string }).error;
  }

  return fallback;
}

function unwrapData<T>(
  payload: {
    data?: T;
    error?: ApiErrorShape;
  },
  fallback: string,
) {
  if (payload.error || !payload.data) {
    throw new Error(getErrorMessage(payload.error, fallback));
  }

  return payload.data;
}

function assertSuccess(
  payload: {
    error?: ApiErrorShape;
  },
  fallback: string,
) {
  if (payload.error) {
    throw new Error(getErrorMessage(payload.error, fallback));
  }
}

export async function login(input: components["schemas"]["LoginInput"]) {
  return unwrapData(
    await apiClient.POST("/v1/auth/login", {
      body: input,
    }),
    "Failed to sign in",
  );
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
  assertSuccess(
    await apiClient.POST("/v1/auth/logout", {
      body: {
        refresh_token: refreshToken,
      },
    }),
    "Failed to sign out",
  );
}

export async function register(input: components["schemas"]["RegisterInput"]) {
  return unwrapData(
    await apiClient.POST("/v1/auth/register", {
      body: input,
    }),
    "Failed to create account",
  );
}

export async function resendRegisterOtp(
  input: components["schemas"]["ResendRegisterOTPInput"],
) {
  return unwrapData(
    await apiClient.POST("/v1/auth/register/resend-otp", {
      body: input,
    }),
    "Failed to resend OTP",
  );
}

export async function verifyRegisterOtp(
  input: components["schemas"]["VerifyRegisterOTPInput"],
) {
  return unwrapData(
    await apiClient.POST("/v1/auth/register/verify", {
      body: input,
    }),
    "Failed to verify OTP",
  );
}

export async function forgotPassword(
  input: components["schemas"]["ForgotPasswordInput"],
) {
  return unwrapData(
    await apiClient.POST("/v1/auth/forgot-password", {
      body: input,
    }),
    "Failed to start password reset",
  );
}

export async function resetPassword(
  input: components["schemas"]["ResetPasswordInput"],
) {
  return unwrapData(
    await apiClient.POST("/v1/auth/reset-password", {
      body: input,
    }),
    "Failed to reset password",
  );
}

export async function changePassword(
  accessToken: string,
  input: {
  current_password: string;
  new_password: string;
},
) {
  const client = createApiClient(accessToken);
  return unwrapData(
    await client.PATCH("/v1/auth/change-password", {
      body: {
        current_password: input.current_password,
        new_password: input.new_password,
      },
    }),
    "Failed to update password",
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

export async function deleteProfile(
  accessToken: string,
  input: { current_password: string },
) {
  const client = createApiClient(accessToken) as {
    DELETE: (
      path: "/v1/users/me",
      init?: { body?: { current_password: string } },
    ) => Promise<{ data?: unknown; error?: ApiErrorShape }>;
  };

  assertSuccess(
    await client.DELETE("/v1/users/me", {
      body: input,
    }),
    "Failed to delete account",
  );
}
