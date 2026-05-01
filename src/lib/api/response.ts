export function getApiErrorMessage(payload: unknown, fallback: string) {
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

export function unwrapData<T>(
  payload: {
    data?: T;
    error?: unknown;
  },
  fallback: string,
) {
  if (payload.error || !payload.data) {
    throw new Error(getApiErrorMessage(payload.error, fallback));
  }

  return payload.data;
}

export function assertSuccess(
  payload: {
    error?: unknown;
  },
  fallback: string,
) {
  if (payload.error) {
    throw new Error(getApiErrorMessage(payload.error, fallback));
  }
}
