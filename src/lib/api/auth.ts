import { apiClient, createApiClient } from "#/lib/api/client";
import { loadCurrentUser, refreshAuthSession } from "#/lib/auth";
import type { components } from "#/lib/api/generated/schema";
import { assertSuccess, unwrapData } from "./response";

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

export async function logout() {
  assertSuccess(
    await apiClient.POST("/v1/auth/logout"),
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
  input: components["schemas"]["ChangePasswordInput"],
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
  input: components["schemas"]["DeleteAccountInput"],
) {
  const client = createApiClient(accessToken);

  assertSuccess(
    await client.DELETE("/v1/users/me", {
      body: input,
    }),
    "Failed to delete account",
  );
}
