import React from "react";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import BillingPage from "../app/(app)/billing/page";

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

const bill = {
  id: 1,
  bill_number: "BLL202608070001",
  patient_id: 1,
  encounter_id: 2,
  total_amount: 5000,
  paid_amount: 0,
  balance: 5000,
  payment_status: "Unpaid",
  insurance_provider: null,
  created_at: "2026-08-07T09:00:00.000Z",
  patient: { first_name: "Chifundo", last_name: "Mwale", hospital_number: "000013" },
};

describe("BillingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.realtimeHandlers.clear();
    mocks.subscribe.mockImplementation((channel: string, handler: (data: unknown) => void) => {
      mocks.realtimeHandlers.set(channel, handler);
      return () => mocks.realtimeHandlers.delete(channel);
    });
    mocks.get.mockImplementation((endpoint: string) => {
      if (endpoint === "/bills") {
        return Promise.resolve({ data: [bill] });
      }
      return Promise.resolve({ data: [] });
    });
  });

  it("refetches the invoice list when a billing event arrives on the realtime channel", async () => {
    render(<BillingPage />);

    await screen.findByText("BLL202608070001");

    const settledBill = {
      ...bill,
      id: 2,
      bill_number: "BLL202608070002",
      payment_status: "Paid",
    };
    mocks.get.mockImplementation((endpoint: string) => {
      if (endpoint === "/bills") {
        return Promise.resolve({ data: [settledBill] });
      }
      return Promise.resolve({ data: [] });
    });

    const handler = mocks.realtimeHandlers.get("clinops_billing_invoices");
    expect(handler).toBeDefined();

    await act(async () => {
      handler!({
        event: "UPDATE",
        bill_id: 2,
        encounter_id: 2,
        patient_id: 1,
        bill_number: "BLL202608070002",
        payment_status: "Paid",
        total_amount: 5000,
        paid_amount: 5000,
        balance: 0,
        occurred_at: "2026-08-07T10:00:00.000Z",
      });
    });

    expect(await screen.findByText("BLL202608070002")).toBeInTheDocument();
  });

  it("opens a bill details modal from View Details showing itemized charges and totals", async () => {
    const detailedBill = {
      ...bill,
      encounter: { encounter_type: "OPD" },
      items: [
        { id: 10, item_name: "Paracetamol 500mg", quantity: 2, unit_price: 1500, total: 3000, source_type: "prescription" },
        { id: 11, item_name: "OPD Consultation", quantity: 1, unit_price: 2000, total: 2000 },
      ],
      payments: [],
    };
    mocks.get.mockImplementation((endpoint: string) => {
      if (endpoint === "/bills") {
        return Promise.resolve({ data: [detailedBill] });
      }
      return Promise.resolve({ data: [] });
    });

    render(<BillingPage />);

    await screen.findByText("BLL202608070001");
    fireEvent.click(screen.getByRole("button", { name: "View Details" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Paracetamol 500mg")).toBeInTheDocument();
    expect(screen.getByText("OPD Consultation")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("MK 1,500")).toBeInTheDocument();
    expect(screen.getByText("MK 3,000")).toBeInTheDocument();
    expect(screen.getAllByText("MK 5,000").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /open patient record/i })).toHaveAttribute("href", "/patients/1");
  });
});
