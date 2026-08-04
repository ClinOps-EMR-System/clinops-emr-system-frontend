import React from "react";
import { render, screen, act, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { AuthProvider, useAuth } from "../store/RoleContext";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter() {
    return {
      push: mockPush,
    };
  },
  usePathname() {
    return "/dashboard";
  },
}));

// Mock fetch for /me endpoint
const mockFetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({
    data: {
      id: 1,
      username: "Dizzy",
      name: "Dickson D",
      email: "test@example.com",
      is_active: true,
      roles: ["Receptionist"],
    },
  }),
});
vi.stubGlobal("fetch", mockFetch);

// Test helper component
function TestComponent() {
  const { token, user, login, logout, isAuthenticated } = useAuth();
  return (
    <div>
      <div data-testid="auth-status">{isAuthenticated ? "Authenticated" : "Guest"}</div>
      <div data-testid="token-val">{token ?? "No Token"}</div>
      <div data-testid="user-val">{user?.name ?? "No User"}</div>
      <button
        onClick={() =>
          login("mock-token", {
            id: 1,
            username: "Dizzy",
            name: "Dickson D",
            email: "test@example.com",
            is_active: true,
          })
        }
      >
        Sign In
      </button>
      <button onClick={logout}>Sign Out</button>
    </div>
  );
}

describe("AuthContext Session Store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("should initialize as unauthenticated and read stored credentials if empty", async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId("auth-status")).toHaveTextContent("Guest");
    expect(screen.getByTestId("token-val")).toHaveTextContent("No Token");
    expect(screen.getByTestId("user-val")).toHaveTextContent("No User");
  });

  it("should handle login successfully and write to localStorage", async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const signInButton = screen.getByText("Sign In");
    await act(async () => {
      signInButton.click();
    });

    expect(screen.getByTestId("auth-status")).toHaveTextContent("Authenticated");
    expect(screen.getByTestId("token-val")).toHaveTextContent("mock-token");
    expect(screen.getByTestId("user-val")).toHaveTextContent("Dickson D");

    expect(localStorage.getItem("clinops_token")).toBe("mock-token");
    expect(JSON.parse(localStorage.getItem("clinops_user") || "{}").name).toBe("Dickson D");
    expect(mockPush).toHaveBeenCalledWith("/receptionist");
  });

  it("should handle logout and clear state and localStorage", async () => {
    localStorage.setItem("clinops_token", "saved-token");
    localStorage.setItem(
      "clinops_user",
      JSON.stringify({ id: 1, name: "Saved User", email: "saved@test.com", is_active: true })
    );

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Initial state should load from localStorage
    expect(screen.getByTestId("auth-status")).toHaveTextContent("Authenticated");
    expect(screen.getByTestId("token-val")).toHaveTextContent("saved-token");
    expect(screen.getByTestId("user-val")).toHaveTextContent("Saved User");

    const signOutButton = screen.getByText("Sign Out");
    await act(async () => {
      signOutButton.click();
    });

    expect(screen.getByTestId("auth-status")).toHaveTextContent("Guest");
    expect(screen.getByTestId("token-val")).toHaveTextContent("No Token");
    expect(screen.getByTestId("user-val")).toHaveTextContent("No User");

    expect(localStorage.getItem("clinops_token")).toBeNull();
    expect(localStorage.getItem("clinops_user")).toBeNull();
    expect(mockPush).toHaveBeenCalledWith("/auth");
  });

  it("should listen to global clinops_unauthorized events and force redirect to /auth", async () => {
    localStorage.setItem("clinops_token", "valid-token");
    localStorage.setItem(
      "clinops_user",
      JSON.stringify({ id: 1, name: "User", email: "test@test.com", is_active: true })
    );

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId("auth-status")).toHaveTextContent("Authenticated");

    // Dispatch the custom unauthorized event (like api.ts does on a 401 response)
    await act(async () => {
      window.dispatchEvent(new Event("clinops_unauthorized"));
    });

    expect(screen.getByTestId("auth-status")).toHaveTextContent("Guest");
    expect(localStorage.getItem("clinops_token")).toBeNull();
    expect(mockPush).toHaveBeenCalledWith("/auth");
  });

  it("should refresh the stored profile from /user on mount, healing a stale/role-less session", async () => {
    localStorage.setItem("clinops_token", "saved-token");
    localStorage.setItem(
      "clinops_user",
      JSON.stringify({ id: 1, name: "Admin User", email: "admin@test.com", is_active: true })
    );

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            id: 1,
            username: "admin",
            name: "Admin User",
            email: "admin@test.com",
            is_active: true,
            department: null,
            roles: ["Admin"],
            permissions: ["user.manage", "audit.view"],
          },
        }),
    });

    render(
      <AuthProvider>
        <ProfileProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("user-roles")).toHaveTextContent(JSON.stringify(["Admin"]));
    });

    const stored = JSON.parse(localStorage.getItem("clinops_user") || "{}");
    expect(stored.roles).toEqual(["Admin"]);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/user"),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer saved-token" }),
      })
    );
  });

  it("should preserve the stored session when the /user refresh fails", async () => {
    localStorage.setItem("clinops_token", "saved-token");
    localStorage.setItem(
      "clinops_user",
      JSON.stringify({
        id: 1,
        name: "Stored User",
        email: "stored@test.com",
        is_active: true,
        roles: ["Doctor"],
      })
    );

    mockFetch.mockRejectedValueOnce(new Error("offline"));

    render(
      <AuthProvider>
        <ProfileProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("auth-status")).toHaveTextContent("Authenticated");
    });

    expect(screen.getByTestId("user-val")).toHaveTextContent("Stored User");
    expect(screen.getByTestId("user-roles")).toHaveTextContent(JSON.stringify(["Doctor"]));
  });
});

function ProfileProbe() {
  const { user, isAuthenticated } = useAuth();
  return (
    <div>
      <div data-testid="auth-status">{isAuthenticated ? "Authenticated" : "Guest"}</div>
      <div data-testid="user-val">{user?.name ?? "No User"}</div>
      <div data-testid="user-roles">{JSON.stringify(user?.roles ?? null)}</div>
    </div>
  );
}

