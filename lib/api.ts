import { getApiBaseUrl } from "./config";

const API_BASE = getApiBaseUrl();

interface RequestOptions extends RequestInit {
  token?: string | null;
}

interface ApiError extends Error {
  status?: number;
  errors?: Record<string, string[]>;
}

interface PendingMutation {
  endpoint: string;
  method: string;
  body: unknown;
  queued_at: number;
}

async function request(endpoint: string, options: RequestOptions = {}) {
  const { token, ...init } = options;
  const headers = new Headers(init.headers);

  if (!headers.has("Content-Type") && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...init,
    headers,
  });

  // Handle network errors — queue for retry when offline
  if (!response && !navigator.onLine) {
    const method = init.method || "GET";
    if (method !== "GET") {
      try {
        const pending = JSON.parse(localStorage.getItem("clinops_pending") || "[]");
        pending.push({
          endpoint,
          method,
          body: init.body,
          queued_at: Date.now(),
        });
        localStorage.setItem("clinops_pending", JSON.stringify(pending));
        window.dispatchEvent(new Event("clinops_pending_change"));
      } catch { /* quota exceeded */ }
    }
    throw new Error("You are offline. The action has been queued and will sync when you reconnect.");
  }

  if (response.status === 204) {
    return null;
  }

  // Handle 401 Unauthorized token expirations cleanly
  if (response.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("clinops_token");
      localStorage.removeItem("clinops_user");
      window.dispatchEvent(new Event("clinops_unauthorized"));
    }
  }

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || "An error occurred while fetching the data.") as ApiError;
    error.status = response.status;
    error.errors = data.errors || {};
    throw error;
  }

  return data;
}

/**
 * Replay queued mutations when the browser comes back online.
 * Deduplicates by endpoint+method+body and skips stale entries (>1h old).
 */
async function replayPending(): Promise<void> {
  if (!navigator.onLine) return;

  const raw = localStorage.getItem("clinops_pending");
  if (!raw) return;

  let pending: PendingMutation[];
  try {
    pending = JSON.parse(raw);
  } catch {
    localStorage.removeItem("clinops_pending");
    return;
  }

  if (!pending.length) return;

  const token = localStorage.getItem("clinops_token");
  const oneHourAgo = Date.now() - 60 * 60 * 1000;

  // Deduplicate: keep only the latest mutation per endpoint+method+body key
  const deduped = new Map<string, PendingMutation>();
  for (const mutation of pending) {
    const key = `${mutation.method}:${mutation.endpoint}:${typeof mutation.body === "string" ? mutation.body : JSON.stringify(mutation.body)}`;
    deduped.set(key, mutation);
  }

  const replayable = [...deduped.values()].filter((m) => m.queued_at > oneHourAgo);
  const stale = pending.length - replayable.length;

  let succeeded = 0;
  let failed = 0;

  for (const mutation of replayable) {
    try {
      await request(mutation.endpoint, {
        method: mutation.method,
        body: mutation.body instanceof FormData ? mutation.body : JSON.stringify(mutation.body),
        token,
      });
      succeeded++;
    } catch {
      failed++;
    }
  }

  // Clear the queue and re-add failed items
  if (failed > 0) {
    const failedMutations = replayable.slice(-failed);
    localStorage.setItem("clinops_pending", JSON.stringify(failedMutations));
  } else {
    localStorage.removeItem("clinops_pending");
  }

  window.dispatchEvent(new Event("clinops_pending_change"));

  if (succeeded > 0 || stale > 0) {
    console.log(`[ClinOps] Synced ${succeeded} action(s). ${stale} expired entry(ies) discarded.${failed > 0 ? ` ${failed} failed.` : ""}`);
  }
}

// Register online listener (browser only)
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    // Small delay to let network stabilize
    setTimeout(replayPending, 1000);
  });
}

export const api = {
  get: (endpoint: string, token?: string | null) =>
    request(endpoint, { method: "GET", token }),

  post: (endpoint: string, body: unknown, token?: string | null) =>
    request(endpoint, {
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body),
      token,
    }),

  put: (endpoint: string, body: unknown, token?: string | null) =>
    request(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
      token,
    }),

  delete: (endpoint: string, token?: string | null) =>
    request(endpoint, { method: "DELETE", token }),
};
