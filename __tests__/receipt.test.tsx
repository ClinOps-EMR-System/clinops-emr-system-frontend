import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Receipt } from "../components/payments/Receipt";
import type { ReceiptData } from "../types/payments";

const receipt: ReceiptData = {
  bill_id: 1,
  bill_number: "BLL-1001",
  created_at: "2026-08-05T10:00:00Z",
  payment_status: "Partially Paid",
  total_amount: 10000,
  paid_amount: 6000,
  balance: 4000,
  patient: { id: 1, hospital_number: "H-0001", first_name: "Jane", last_name: "Doe" },
  items: [{ id: 1, item_name: "Consultation", quantity: 1, unit_price: 10000, total: 10000 }],
  payments: [
    { id: 42, payment_number: "PAY-XYZ", amount_paid: 6000, payment_method: "Cash", payment_reference: null, received_by: { id: 2, name: "Cashier" }, created_at: "2026-08-05T10:05:00Z", status: "completed", paychangu_charge_id: null, paychangu_trans_id: null },
  ],
  issued_by: { id: 2, name: "Cashier" },
};

describe("Receipt", () => {
  it("renders bill, patient, items, payment and totals", () => {
    render(<Receipt receipt={receipt} highlightPaymentId={42} onDone={vi.fn()} />);
    expect(screen.getByText("Receipt")).toBeInTheDocument();
    expect(screen.getByText("BLL-1001")).toBeInTheDocument();
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("Consultation")).toBeInTheDocument();
    expect(screen.getByText("PAY-XYZ")).toBeInTheDocument();
  });

  it("fires onDone when Done is pressed", () => {
    const onDone = vi.fn();
    render(<Receipt receipt={receipt} onDone={onDone} />);
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("has a Print button", () => {
    render(<Receipt receipt={receipt} onDone={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Print" })).toBeInTheDocument();
  });
});
