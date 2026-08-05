import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { BillPicker } from "../components/payments/BillPicker";
import { BillPreview } from "../components/payments/BillPreview";
import type { BillSummary, BillDetail } from "../types/payments";

describe("BillPicker", () => {
  const bills: BillSummary[] = [
    {
      id: 2,
      bill_number: "BLL-2002",
      total_amount: 10000,
      paid_amount: 10000,
      balance: 0,
      payment_status: "Paid",
      created_at: "2026-08-05T10:00:00Z",
    },
    {
      id: 1,
      bill_number: "BLL-1001",
      total_amount: 10000,
      paid_amount: 4000,
      balance: 6000,
      payment_status: "Partially Paid",
      created_at: "2026-08-04T10:00:00Z",
    },
  ];

  it("renders each bill with balance and a collect action", () => {
    const onSelect = vi.fn();
    render(<BillPicker bills={bills} selectedId={null} loading={false} onSelect={onSelect} />);
    expect(screen.getByText("BLL-2002")).toBeInTheDocument();
    expect(screen.getByText("BLL-1001")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: /collect/i })[0]);
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it("renders the amber status badge for partially paid bills", () => {
    const { container } = render(
      <BillPicker
        bills={[{ ...bills[1] }]}
        selectedId={null}
        loading={false}
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByText("Partially Paid")).toBeInTheDocument();
    expect(container.querySelector(".bg-amber-50")).toBeInTheDocument();
  });
});

describe("BillPreview", () => {
  const bill: BillDetail = {
    id: 1,
    bill_number: "BLL-1001",
    total_amount: 10000,
    paid_amount: 4000,
    balance: 6000,
    payment_status: "Partially Paid",
    created_at: "2026-08-04T10:00:00Z",
    items: [
      { id: 1, item_name: "Consultation", quantity: 1, unit_price: 10000, total: 10000 },
    ],
  };

  it("renders the item lines and balance", () => {
    render(<BillPreview bill={bill} loading={false} />);
    expect(screen.getByText("Consultation")).toBeInTheDocument();
    expect(screen.getAllByText("MK 10,000").length).toBeGreaterThan(0);
    expect(screen.getByText("Balance")).toBeInTheDocument();
    expect(screen.getByText("MK 6,000")).toBeInTheDocument();
  });
});
