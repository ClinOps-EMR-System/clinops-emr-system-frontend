import { describe, it, expect } from "vitest";
import { parseBilling } from "../types/billing";

describe("parseBilling", () => {
  const valid = {
    billing: {
      bill_id: 12,
      bill_number: "BLL202608030001",
      items_added: [
        { item_name: "Patient Registration", unit_price: "2000.00", quantity: 1, total: "2000.00" },
      ],
      running_total: "2000.00",
      payment_status: "Unpaid",
    },
  };

  it("returns the summary for a well-formed billing block", () => {
    expect(parseBilling(valid)).toEqual(valid.billing);
  });

  it("returns null when billing is missing", () => {
    expect(parseBilling({ status: 201, message: "Created", data: {} })).toBeNull();
    expect(parseBilling(null)).toBeNull();
    expect(parseBilling(undefined)).toBeNull();
  });

  it("returns null for a malformed billing block", () => {
    expect(parseBilling({ billing: { ...valid.billing, items_added: "nope" } })).toBeNull();
    expect(parseBilling({ billing: { ...valid.billing, items_added: [{ item_name: 1 }] } })).toBeNull();
    expect(parseBilling({ billing: { ...valid.billing, bill_id: "12" } })).toBeNull();
    expect(parseBilling({ billing: { ...valid.billing, running_total: 2000 } })).toBeNull();
  });
});
