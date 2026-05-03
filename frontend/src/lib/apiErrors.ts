"use client";

/**
 * Auth-error utilities. The backend returns HTTP 401 from any OpenAI-using endpoint
 * when the user hasn't supplied an API key (or supplied an invalid one). These helpers
 * detect that, dispatch a window event so the API key modal opens automatically, and
 * surface a friendly message that calling components can show to the user.
 */

export const API_KEY_MODAL_EVENT = "open-api-key-modal";

const FALLBACK_AUTH_MESSAGE =
  "OpenAI API key is missing or invalid. Open the key icon at the bottom of the sidebar to set or update your key.";

export function openApiKeyModal(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(API_KEY_MODAL_EVENT));
}

interface MaybeAxiosError {
  response?: { status?: number; data?: { detail?: string } };
  status?: number;
  message?: string;
}

export function isAuthError(err: unknown): boolean {
  const e = err as MaybeAxiosError;
  return e?.response?.status === 401 || e?.status === 401;
}

/** Returns a user-facing message for an auth error, or null if `err` isn't a 401. */
export function getAuthErrorMessage(err: unknown): string | null {
  if (!isAuthError(err)) return null;
  const e = err as MaybeAxiosError;
  return e?.response?.data?.detail || FALLBACK_AUTH_MESSAGE;
}

/**
 * For axios errors. If 401, opens the modal and returns the friendly detail; else null.
 * Use in axios catch blocks: `const auth = handleAuthError(err); if (auth) return setError(auth);`
 */
export function handleAuthError(err: unknown): string | null {
  const msg = getAuthErrorMessage(err);
  if (msg) {
    openApiKeyModal();
    return msg;
  }
  return null;
}

/**
 * For fetch responses (used before reading the body of a streaming response). If status
 * is 401, opens the modal and throws an Error so the caller's catch handles it.
 */
export async function checkAuthResponse(response: Response): Promise<void> {
  if (response.status !== 401) return;
  openApiKeyModal();
  let detail = FALLBACK_AUTH_MESSAGE;
  try {
    const body = await response.json();
    if (body?.detail) detail = body.detail;
  } catch {
    /* body wasn't JSON, keep fallback */
  }
  const e = new Error(detail) as Error & { status?: number };
  e.status = 401;
  throw e;
}
