import { getApiBaseUrl } from "./config";

const API_BASE = getApiBaseUrl();

interface RequestOptions extends RequestInit {
  token?: string | null;
}

interface ApiError extends Error {
  status?: number;
  errors?: Record<string, string[]>;
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
