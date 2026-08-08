import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { api } from "@/lib/api";
import { adminApi } from "@/lib/services/admin";
import { PaymentForm } from "../components/payments/PaymentForm";
import type { PayChanguChargeResult } from "@/lib/services/admin";

vi.mock("@/lib/api", () => ({
  api: { post: vi.fn() },
}));

vi.mock("@/lib/services/admin", () => ({
  adminApi: {
    getPayChanguOperators: vi.fn(),
    initializePayChanguPayment: vi.fn(),
    verifyPayChanguPayment: vi.fn(),
  },
}));

const mockedApi = vi.mocked(api);
const mockedAdminApi = vi.mocked(adminApi);

const baseProps = {
  token: "t",
  billId: 1,
  billNumber: "BLL-1001",
  balance: 6000,
  onPaymentRecorded: vi.fn(),
  onPayChanguInitiated: vi.fn(),
};

describe("PaymentForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("posts a canonical payment method for the direct path", async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: { id: 9, payment_number: "PAY-XYZ", amount_paid: 6000, payment_method: "Cash" },
    });
    const onPaymentRecorded = vi.fn();

    render(<PaymentForm {...baseProps} onPaymentRecorded={onPaymentRecorded} />);

    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: "6000" } });
    fireEvent.change(screen.getByLabelText(/method/i), { target: { value: "Cash" } });
    fireEvent.click(screen.getByRole("button", { name: /record payment/i }));

    await waitFor(() => expect(onPaymentRecorded).toHaveBeenCalledTimes(1));
    expect(mockedApi.post).toHaveBeenCalledWith(
      "/bills/1/payments",
      { amount_paid: 6000, payment_method: "Cash", payment_reference: null },
      "t"
    );
  });

  it("initializes a PayChangu charge for the paychangu method", async () => {
    mockedAdminApi.getPayChanguOperators.mockResolvedValueOnce({
      operators: [{ id: 1, name: "Airtel Money", ref_id: "airtel", short_code: "AM" }],
    });
    const charge: PayChanguChargeResult = {
      charge_id: "pc-1",
      trans_id: "tr-1",
      status: "pending",
      currency: "MWK",
      amount: 6000,
      mobile: "990000000",
      operator: "Airtel Money",
      payment_id: 42,
    };
    mockedAdminApi.initializePayChanguPayment.mockResolvedValueOnce(charge);
    const onPayChanguInitiated = vi.fn();

    render(<PaymentForm {...baseProps} onPayChanguInitiated={onPayChanguInitiated} />);

    fireEvent.change(screen.getByLabelText(/method/i), { target: { value: "paychangu" } });
    await waitFor(() =>
      expect(screen.getByLabelText(/operator/i)).toBeInTheDocument()
    );
    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: "6000" } });
    fireEvent.change(screen.getByLabelText(/operator/i), { target: { value: "airtel" } });
    fireEvent.change(screen.getByLabelText(/mobile/i), { target: { value: "990000000" } });
    fireEvent.click(screen.getByRole("button", { name: /request payment/i }));

    await waitFor(() => expect(onPayChanguInitiated).toHaveBeenCalledTimes(1));
    expect(mockedAdminApi.initializePayChanguPayment).toHaveBeenCalledWith("t", 1, {
      mobile: "990000000",
      operator_ref_id: "airtel",
      amount: 6000,
    });
  });

  it("shows the API message when a payment is rejected with 422", async () => {
    const err = new Error("The patient must be discharged before this bill can be paid.") as Error & {
      status?: number;
      errors?: Record<string, string[]>;
    };
    err.status = 422;
    err.errors = {};
    mockedApi.post.mockRejectedValueOnce(err);

    render(<PaymentForm {...baseProps} />);

    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: "6000" } });
    fireEvent.change(screen.getByLabelText(/method/i), { target: { value: "Cash" } });
    fireEvent.click(screen.getByRole("button", { name: /record payment/i }));

    expect(
      await screen.findByText("The patient must be discharged before this bill can be paid.")
    ).toBeInTheDocument();
  });

  it("shows the specific unsupported-method message when payment_method fails validation", async () => {
    const err = new Error("The selected payment method is invalid.") as Error & {
      status?: number;
      errors?: Record<string, string[]>;
    };
    err.status = 422;
    err.errors = { payment_method: ["The selected payment method is invalid."] };
    mockedApi.post.mockRejectedValueOnce(err);

    render(<PaymentForm {...baseProps} />);

    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: "6000" } });
    fireEvent.change(screen.getByLabelText(/method/i), { target: { value: "Cash" } });
    fireEvent.click(screen.getByRole("button", { name: /record payment/i }));

    expect(
      await screen.findByText(
        "This payment method is not supported. Choose: Cash, Bank Transfer, Mobile Money, Insurance, Card."
      )
    ).toBeInTheDocument();
  });
});
