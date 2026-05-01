import createClient from "openapi-fetch";
import type { paths } from "./generated/schema";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

export function createApiClient(accessToken?: string) {
  return createClient<paths>({
    baseUrl: API_BASE_URL,
    fetch: (input, init) =>
      fetch(input, {
        ...init,
        credentials: "include",
      }),
    headers: accessToken
      ? {
          Authorization: `Bearer ${accessToken}`,
        }
      : undefined,
  });
}

export const apiClient = createApiClient();
