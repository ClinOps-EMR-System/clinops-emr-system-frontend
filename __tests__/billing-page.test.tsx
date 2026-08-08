import React from "react";
import { render, screen, act, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import BillingPage from "../app/(app)/billing/page";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  subscribe: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  realtimeHandlers: new Map<string, (data: unknown) => void>(),
}));

vi.mock("@/lib/api", () => ({
  api: {
    get: mocks.get,
    post: mocks.post,
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

vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({ success: mocks.success, error: mocks.error }),
}));

vi.mock("@/lib/hooks/usePermissions", () => ({
  usePermissions: () => ({
    can: (permission: string) => permission === "billing.waiver",
    permissions: new Set(["billing.waiver"]),
    roles: [],
    isAdmin: false,
    canAccessAdmin: false,
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

  it("waives a full bill when the Waive button is used with a reason", async () => {
    mocks.post.mockResolvedValue({ status: 200, data: { id: 1, payment_status: "Waived", balance: 0, waived_amount: 5000 } });

    render(<BillingPage />);

    await screen.findByText("BLL202608070001");
    fireEvent.click(screen.getByRole("button", { name: "Waive" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/leave empty to waive the full/i)).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/hardship case/i), { target: { value: "Hardship case approved by facility administrator." } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm Waiver" }));

    await waitFor(() =>
      expect(mocks.success).toHaveBeenCalledWith("Bill waived successfully. Admins, finance, and clinical staff have been notified in realtime.")
    );
    expect(mocks.post).toHaveBeenCalledWith("/bills/1/waive", { reason: "Hardship case approved by facility administrator." }, "test-token");
    expect(mocks.get).toHaveBeenCalledWith("/bills", "test-token");
  });

  it("sends the partial amount when a waiver amount is entered", async () => {
    mocks.post.mockResolvedValue({ status: 200, data: { id: 1, payment_status: "Partially Waived", balance: 3000, waived_amount: 2000 } });

    render(<BillingPage />);

    await screen.findByText("BLL202608070001");
    fireEvent.click(screen.getByRole("button", { name: "Waive" }));

    fireEvent.change(screen.getByPlaceholderText(/leave empty to waive/i), { target: { value: "2000" } });
    fireEvent.change(screen.getByPlaceholderText(/hardship case/i), { target: { value: "Partial support." } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm Waiver" }));

    await waitFor(() => expect(mocks.post).toHaveBeenCalledWith("/bills/1/waive", { amount: 2000, reason: "Partial support." }, "test-token"));
  });

  it("shows a server error inside the waive dialog when the waiver is rejected", async () => {
    mocks.post.mockRejectedValue({ status: 422, message: "The waiver amount cannot exceed the outstanding balance.", errors: {} });

    render(<BillingPage />);

    await screen.findByText("BLL202608070001");
    fireEvent.click(screen.getByRole("button", { name: "Waive" }));
    fireEvent.change(screen.getByPlaceholderText(/hardship case/i), { target: { value: "Over-waive." } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm Waiver" }));

    expect(await screen.findByText("The waiver amount cannot exceed the outstanding balance.")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("shows the specific unsupported-method message when a payment method is rejected", async () => {
    mocks.post.mockRejectedValue({
      status: 422,
      message: "The selected payment method is invalid.",
      errors: { payment_method: ["The selected payment method is invalid."] },
    });

    render(<BillingPage />);

    await screen.findByText("BLL202608070001");
    fireEvent.click(screen.getByRole("button", { name: "Pay" }));
    fireEvent.click(screen.getByRole("button", { name: /record payment/i }));

    expect(
      await screen.findByText(
        "This payment method is not supported. Choose: Cash, Bank Transfer, Mobile Money, Insurance, Card."
      )
    ).toBeInTheDocument();
  });
});
