import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import LabPage from "../app/(app)/lab/page";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  subscribe: vi.fn(),
  realtimeHandlers: new Map<string, (data: unknown) => void>(),
}));

vi.mock("@/lib/api", () => ({
  api: {
    get: mocks.get,
    post: mocks.post,
  },
}));

vi.mock("@/store/RoleContext", () => ({
  useAuth: () => ({ token: "test-token", user: { id: 1, roles: ["Lab Technician"] } }),
}));

vi.mock("@/store/RealtimeContext", () => ({
  useRealtime: () => ({
    subscribe: mocks.subscribe,
    status: "connected",
  }),
}));

const releasedResult = {
  id: 10,
  lab_request_id: 5,
  result_value_numeric: 13.5,
  result_value_text: null,
  unit: "g/dL",
  reference_range: "12-16",
  is_abnormal: false,
  is_critical: false,
  status: "released",
  verified_by: null,
  verified_at: null,
  released_at: "2026-08-06T08:38:21.000000Z",
  created_at: "2026-08-06T08:38:21.000000Z",
  lab_request: {
    id: 5,
    test_name: "CBC",
    loinc_code: "CBC001",
    patient_id: 1,
    encounter: {
      id: 2,
      patient_id: 1,
      patient: { first_name: "Chifundo", last_name: "Mwale", hospital_number: "000013" },
    },
  },
};

const enteredResult = {
  ...releasedResult,
  id: 11,
  status: "entered",
  released_at: null,
  created_at: "2026-08-06T09:00:00.000000Z",
};

const pendingOrder = {
  id: 1,
  patient_id: 1,
  encounter_id: 2,
  order_type: "lab",
  priority: "Routine",
  status: "Ordered",
  created_at: "2026-08-06T08:00:00.000000Z",
  patient: { first_name: "Chifundo", last_name: "Mwale", hospital_number: "000013" },
  lab_request: { id: 5, test_name: "CBC", loinc_code: "CBC001", specimen_type: null, status: "Ordered" },
};

describe("LabPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.realtimeHandlers.clear();
    mocks.subscribe.mockImplementation((channel: string, handler: (data: unknown) => void) => {
      mocks.realtimeHandlers.set(channel, handler);
      return () => mocks.realtimeHandlers.delete(channel);
    });
    mocks.get.mockImplementation((endpoint: string) => {
      if (endpoint === "/orders") {
        return Promise.resolve({ data: { data: [pendingOrder] } });
      }
      if (endpoint === "/lab-results") {
        return Promise.resolve({ data: { data: [] } });
      }
      if (endpoint.startsWith("/services")) {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });
  });

  it("shows auto-released results under the results tab with a Released badge", async () => {
    mocks.get.mockImplementation((endpoint: string) => {
      if (endpoint === "/orders") {
        return Promise.resolve({ data: { data: [pendingOrder] } });
      }
      if (endpoint === "/lab-results") {
        return Promise.resolve({ data: { data: [releasedResult] } });
      }
      return Promise.resolve({ data: [] });
    });

    render(<LabPage />);

    const tab = await screen.findByRole("tab", { name: /Verified Results/ });
    fireEvent.click(tab);

    expect(await screen.findByText("Chifundo Mwale")).toBeInTheDocument();
    expect(screen.getByText("Released")).toBeInTheDocument();
  });

  it("keeps entered results under results entry awaiting verification", async () => {
    mocks.get.mockImplementation((endpoint: string) => {
      if (endpoint === "/orders") {
        return Promise.resolve({ data: { data: [pendingOrder] } });
      }
      if (endpoint === "/lab-results") {
        return Promise.resolve({ data: { data: [enteredResult] } });
      }
      return Promise.resolve({ data: [] });
    });

    render(<LabPage />);

    const tab = await screen.findByRole("tab", { name: /Results Entry/ });
    fireEvent.click(tab);

    expect(await screen.findByText("Chifundo Mwale")).toBeInTheDocument();
    expect(screen.getByText("Awaiting Verify")).toBeInTheDocument();
  });

  it("confirms release in the success message for lab technicians", async () => {
    mocks.post.mockResolvedValue({
      status: 201,
      message: "Result created successfully.",
      data: releasedResult,
    });

    render(<LabPage />);

    const enterButton = await screen.findByRole("button", { name: /Enter Result/ });
    fireEvent.click(enterButton);

    fireEvent.change(screen.getByPlaceholderText("e.g., 12.5, 120"), {
      target: { value: "13.5" },
    });

    fireEvent.change(screen.getByPlaceholderText("e.g., 3500"), {
      target: { value: "1500" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Submit Result/ }));

    await waitFor(() => {
      expect(mocks.post).toHaveBeenCalledWith(
        "/lab-results",
        expect.objectContaining({ lab_request_id: 5, result_value_numeric: 13.5, billable_price: 1500 }),
        "test-token"
      );
    });

    expect(await screen.findByText(/released/i)).toBeInTheDocument();
    expect(screen.queryByText(/until verified/i)).not.toBeInTheDocument();
  });

  it("prefills the billable price from the services catalog when opening the result modal", async () => {
    mocks.get.mockImplementation((endpoint: string) => {
      if (endpoint === "/orders") {
        return Promise.resolve({ data: { data: [pendingOrder] } });
      }
      if (endpoint === "/lab-results") {
        return Promise.resolve({ data: { data: [] } });
      }
      if (endpoint.startsWith("/services")) {
        return Promise.resolve({ data: [{ id: 1, name: "CBC", category: "Lab", unit_price: 3500 }] });
      }
      return Promise.resolve({ data: [] });
    });

    render(<LabPage />);

    const enterButton = await screen.findByRole("button", { name: /Enter Result/ });
    fireEvent.click(enterButton);

    const priceInput = screen.getByPlaceholderText("e.g., 3500");
    expect(priceInput).toBeInTheDocument();
    expect(priceInput).toHaveValue(3500);
  });

  it("refetches the worklist when a lab request arrives on the realtime channel", async () => {
    render(<LabPage />);

    await screen.findByText("CBC");

    const newOrder = {
      ...pendingOrder,
      id: 2,
      lab_request: { id: 6, test_name: "Malaria RDT", loinc_code: "MRDT1", specimen_type: null, status: "Ordered" },
    };
    mocks.get.mockImplementation((endpoint: string) => {
      if (endpoint === "/orders") {
        return Promise.resolve({ data: { data: [newOrder] } });
      }
      if (endpoint === "/lab-results") {
        return Promise.resolve({ data: { data: [] } });
      }
      return Promise.resolve({ data: [] });
    });

    const handler = mocks.realtimeHandlers.get("clinops_lab_requests");
    expect(handler).toBeDefined();

    await act(async () => {
      handler!({
        event: "INSERT",
        lab_request_id: 6,
        encounter_id: 2,
        patient_id: 1,
        is_critical: false,
        status: "ordered",
        color: "blue",
        priority: "normal",
        occurred_at: "2026-08-07T10:00:00.000Z",
      });
    });

    expect(await screen.findByText("Malaria RDT")).toBeInTheDocument();
  });
});
