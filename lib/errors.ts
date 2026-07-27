/**
 * User-friendly error messages for clinical workflows.
 * Follows: "What happened? + Why it matters + What to do next"
 */

const errorMessages: Record<string, { message: string; hint: string }> = {
  network: {
    message: "Could not reach the server.",
    hint: "Check your internet connection and try again. If the problem persists, contact the IT team.",
  },
  unauthorized: {
    message: "Your session has expired.",
    hint: "Please log in again to continue.",
  },
  not_found: {
    message: "The requested record was not found.",
    hint: "It may have been deleted or you may not have permission to view it.",
  },
  validation: {
    message: "Some fields need correction.",
    hint: "Review the highlighted fields and update them before saving.",
  },
  server: {
    message: "The server encountered an error.",
    hint: "Try again in a few moments. If the problem persists, contact the IT team.",
  },
};

interface ApiErrorLike {
  message?: string;
  status?: number;
}

export function friendlyError(err: unknown, context: string): string {
  const apiErr = err as ApiErrorLike;

  // Network errors (TypeError means fetch failed)
  if (err instanceof TypeError && err.message === "Failed to fetch") {
    return `${errorMessages.network.message} ${errorMessages.network.hint}`;
  }

  // HTTP status-based errors
  if (apiErr.status === 401) {
    return `${errorMessages.unauthorized.message} ${errorMessages.unauthorized.hint}`;
  }
  if (apiErr.status === 404) {
    return `${errorMessages.not_found.message} ${errorMessages.not_found.hint}`;
  }
  if (apiErr.status === 422) {
    return `${errorMessages.validation.message} ${errorMessages.validation.hint}`;
  }
  if (apiErr.status && apiErr.status >= 500) {
    return `${errorMessages.server.message} ${errorMessages.server.hint}`;
  }

  // Fallback with context: "Couldn't save vital signs. The server returned an error. Try again."
  const detail = apiErr?.message || "an unexpected error occurred";
  return `Couldn't ${context}. ${detail.charAt(0).toUpperCase() + detail.slice(1)}. Please try again.`;
}