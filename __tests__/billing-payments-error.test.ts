import { describe, it, expect } from "vitest";
import { getPaymentMethodError } from "../lib/billing/payments";

const SUPPORTED_MSG =
  "This payment method is not supported. Choose: Cash, Bank Transfer, Mobile Money, Insurance, Card.";

describe("getPaymentMethodError", () => {
  it("returns the specific message when the payment_method field fails validation", () => {
    expect(
      getPaymentMethodError({
        status: 422,
        message: "The selected payment method is invalid.",
        errors: { payment_method: ["The selected payment method is invalid."] },
      })
    ).toBe(SUPPORTED_MSG);
  });

  it("returns the specific message when payment_method validation error has no status", () => {
    expect(
      getPaymentMethodError({
        message: "The selected payment method is invalid.",
        errors: { payment_method: ["The selected payment method is invalid."] },
      })
    ).toBe(SUPPORTED_MSG);
  });

  it("returns null when a different field failed validation", () => {
    expect(
      getPaymentMethodError({
        status: 422,
        message: "The amount paid field is required.",
        errors: { amount_paid: ["The amount paid field is required."] },
      })
    ).toBeNull();
  });

  it("returns null for errors without an errors payload", () => {
    expect(getPaymentMethodError({ status: 422, message: "Something went wrong." })).toBeNull();
    expect(getPaymentMethodError({ status: 500, message: "Server error." })).toBeNull();
    expect(getPaymentMethodError(null)).toBeNull();
    expect(getPaymentMethodError("not an object")).toBeNull();
  });
});
