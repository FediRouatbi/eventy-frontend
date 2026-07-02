import createClient from "openapi-fetch";
import type { paths } from "./generated/schema";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

const isNgrokAPI = API_BASE_URL.includes(".ngrok-free.");

export function createApiClient(accessToken?: string) {
  const headers: Record<string, string> = {};
  if (isNgrokAPI) {
    headers["ngrok-skip-browser-warning"] = "true";
  }
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return createClient<paths>({
    baseUrl: API_BASE_URL,
    fetch: (input, init) =>
      fetch(input, {
        ...init,
        credentials: "include",
      }),
    headers,
  });
}

export const apiClient = createApiClient();
