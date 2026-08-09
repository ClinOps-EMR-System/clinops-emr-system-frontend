import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ToastProvider } from "@/components/ui/Toast";
import BillingConfirmation from "../components/billing/BillingConfirmation";
import type { BillingSummary } from "../types/billing";

describe("BillingConfirmation", () => {
  const billing: BillingSummary = {
    bill_id: 12,
    bill_number: "BLL202608030001",
    items_added: [
      { item_name: "Patient Registration", unit_price: "2000.00", quantity: 1, total: "2000.00" },
      { item_name: "OPD Consultation", unit_price: "5000.00", quantity: 1, total: "5000.00" },
    ],
    running_total: "7000.00",
    payment_status: "Unpaid",
  };

  it("renders the title, bill number, items and running total", () => {
    render(<BillingConfirmation billing={billing} onDone={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByText("Charges Added to Bill")).toBeInTheDocument();
    expect(screen.getByText("Bill BLL202608030001")).toBeInTheDocument();
    expect(screen.getByText("Patient Registration")).toBeInTheDocument();
    expect(screen.getByText("OPD Consultation")).toBeInTheDocument();
    expect(screen.getByText("MK 2,000 × 1")).toBeInTheDocument();
    expect(screen.getByText("MK 7,000")).toBeInTheDocument();
    expect(screen.getByText("Unpaid")).toBeInTheDocument();
  });

  it("fires onDone when Done is pressed", () => {
    const onDone = vi.fn();
    render(<ToastProvider><BillingConfirmation billing={billing} onDone={onDone} onClose={vi.fn()} /></ToastProvider>);

    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("fires onClose when Close is pressed", () => {
    const onClose = vi.fn();
    render(<ToastProvider><BillingConfirmation billing={billing} onDone={vi.fn()} onClose={onClose} /></ToastProvider>);

    fireEvent.click(screen.getByText("Close", { selector: "button" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
