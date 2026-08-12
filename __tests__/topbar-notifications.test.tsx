import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Topbar from "../components/layout/Topbar";

const mocks = vi.hoisted(() => ({
  markRead: vi.fn(),
  markAllRead: vi.fn(),
  get: vi.fn(),
  notificationsData: [] as Array<{
    id: number;
    user_id: number;
    admission_id: number | null;
    patient_id: number | null;
    type: string;
    title: string;
    message: string;
    channel: string;
    read: boolean;
    read_at: string | null;
    created_at: string;
  }>,
}));

vi.mock("@/lib/api", () => ({
  api: { get: mocks.get },
}));

vi.mock("@/store/RoleContext", () => ({
  useAuth: () => ({
    user: { name: "Dr. Test", email: "test@clinops.org" },
    logout: vi.fn(),
    token: "test-token",
  }),
}));

vi.mock("@/hooks/useAdmissions", () => ({
  useNotifications: () => ({
    notifications: mocks.notificationsData,
    loading: false,
    error: null,
    refetch: vi.fn(),
    markRead: mocks.markRead,
    markAllRead: mocks.markAllRead,
  }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/components/ui/sidebar", () => ({
  useSidebar: () => ({
    setOpenMobile: vi.fn(),
    toggleSidebar: vi.fn(),
    open: true,
    isMobile: false,
  }),
}));

vi.mock("@/store/RealtimeContext", () => ({
  useRealtime: () => ({
    subscribe: () => () => {},
    status: "offline",
  }),
}));

const seededNotifications = [
  {
    id: 1,
    user_id: 1,
    admission_id: null,
    patient_id: 5,
    type: "order.created",
    title: "New lab Order",
    message: "New lab order for Javon McKenzie (No indication)",
    channel: "in_app",
    read: false,
    read_at: null,
    created_at: "2026-08-06T08:32:09.000000Z",
  },
  {
    id: 2,
    user_id: 1,
    admission_id: null,
    patient_id: 5,
    type: "lab.result.verified",
    title: "Lab result verified",
    message: "CBC has been verified",
    channel: "in_app",
    read: true,
    read_at: "2026-08-06T09:00:00.000000Z",
    created_at: "2026-08-06T08:37:47.000000Z",
  },
];

describe("Topbar notifications panel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.notificationsData = seededNotifications;
  });

  it("renders notifications from the API in the dropdown", () => {
    render(<Topbar />);

    fireEvent.click(screen.getByRole("button", { name: /Notifications/i }));

    expect(screen.getByText("New lab Order")).toBeInTheDocument();
    expect(screen.getByText("Lab result verified")).toBeInTheDocument();
  });

  it("shows an empty state when there are no notifications", () => {
    mocks.notificationsData = [];

    render(<Topbar />);

    fireEvent.click(screen.getByRole("button", { name: /Notifications/i }));

    expect(screen.getByText("No notifications yet")).toBeInTheDocument();
  });

  it("marks a notification as read through the API", () => {
    render(<Topbar />);

    fireEvent.click(screen.getByRole("button", { name: /Notifications/i }));
    fireEvent.click(screen.getByText("New lab Order"));

    expect(mocks.markRead).toHaveBeenCalledWith(1);
  });

  it("marks all notifications as read through the API", () => {
    render(<Topbar />);

    fireEvent.click(screen.getByRole("button", { name: /Notifications/i }));
    fireEvent.click(screen.getByRole("button", { name: /Mark all read/i }));

    expect(mocks.markAllRead).toHaveBeenCalled();
  });

  it("clears the panel locally without removing them from the server", () => {
    render(<Topbar />);

    fireEvent.click(screen.getByRole("button", { name: /Notifications/i }));
    fireEvent.click(screen.getByRole("button", { name: /Clear all/i }));

    expect(screen.getByText("No notifications yet")).toBeInTheDocument();
    expect(mocks.markRead).not.toHaveBeenCalled();
    expect(mocks.markAllRead).not.toHaveBeenCalled();
  });
});
