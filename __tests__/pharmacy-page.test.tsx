import React from "react";
import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import PharmacyPage from "../app/(app)/pharmacy/page";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  subscribe: vi.fn(),
  realtimeHandlers: new Map<string, (data: unknown) => void>(),
}));

vi.mock("@/lib/api", () => ({
  api: {
    get: mocks.get,
  },
}));

vi.mock("@/store/RoleContext", () => ({
  useAuth: () => ({ token: "test-token" }),
}));

vi.mock("@/store/RealtimeContext", () => ({
  useRealtime: () => ({
    subscribe: mocks.subscribe,
    status: "connected",
  }),
}));

const item = {
  prescription_id: 1,
  patient: { id: 1, hospital_number: "000013", full_name: "Chifundo Mwale" },
  encounter_id: 2,
  drug_name: "Amoxicillin",
  dosage: "500mg",
  route: "Oral",
  frequency: "TDS",
  duration: "7 days",
  quantity_dispensed: null,
  status: "Pending",
  prescribed_by: "Dr. Memory Kazembe",
  prescribed_at: "2026-08-07T09:00:00.000Z",
};

describe("PharmacyPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.realtimeHandlers.clear();
    mocks.subscribe.mockImplementation((channel: string, handler: (data: unknown) => void) => {
      mocks.realtimeHandlers.set(channel, handler);
      return () => mocks.realtimeHandlers.delete(channel);
    });
    mocks.get.mockImplementation((endpoint: string) => {
      if (endpoint.startsWith("/worklist/pharmacy")) {
        return Promise.resolve({ data: { data: [item] } });
      }
      return Promise.resolve({ data: null });
    });
  });

  it("refetches the pharmacy queue when a prescription event arrives on the realtime channel", async () => {
    render(<PharmacyPage />);

    await screen.findByText("Amoxicillin");

    const newItem = { ...item, prescription_id: 2, drug_name: "Paracetamol" };
    mocks.get.mockImplementation((endpoint: string) => {
      if (endpoint.startsWith("/worklist/pharmacy")) {
        return Promise.resolve({ data: { data: [newItem] } });
      }
      return Promise.resolve({ data: null });
    });

    const handler = mocks.realtimeHandlers.get("clinops_pharmacy_queue");
    expect(handler).toBeDefined();

    await act(async () => {
      handler!({
        event: "UPDATE",
        prescription_id: 2,
        encounter_id: 2,
        patient_id: 1,
        status: "Verified",
        billing_status: "paid",
        occurred_at: "2026-08-07T10:00:00.000Z",
      });
    });

    expect(await screen.findByText("Paracetamol")).toBeInTheDocument();
  });
});
