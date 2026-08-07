export interface BillingLine {
  item_name: string;
  unit_price: string;
  quantity: number;
  total: string;
}

export interface BillingSummary {
  bill_id: number;
  bill_number: string;
  items_added: BillingLine[];
  running_total: string;
  payment_status: string;
  payment?: {
    amount_paid: number;
    payment_method: string;
  };
}

export function parseBilling(payload: unknown): BillingSummary | null {
  if (payload == null || typeof payload !== "object") {
    return null;
  }

  const billing = (payload as Record<string, unknown>).billing;
  if (billing == null || typeof billing !== "object") {
    return null;
  }

  const b = billing as Record<string, unknown>;
  if (
    typeof b.bill_id !== "number" ||
    typeof b.bill_number !== "string" ||
    typeof b.running_total !== "string" ||
    typeof b.payment_status !== "string" ||
    !Array.isArray(b.items_added)
  ) {
    return null;
  }

  const items: BillingLine[] = [];
  for (const item of b.items_added) {
    if (
      item == null ||
      typeof item !== "object" ||
      typeof (item as Record<string, unknown>).item_name !== "string" ||
      typeof (item as Record<string, unknown>).unit_price !== "string" ||
      typeof (item as Record<string, unknown>).quantity !== "number" ||
      typeof (item as Record<string, unknown>).total !== "string"
    ) {
      return null;
    }
    items.push(item as BillingLine);
  }

  const payment = b.payment && typeof b.payment === "object"
    ? {
        amount_paid: Number((b.payment as Record<string, unknown>).amount_paid) || 0,
        payment_method: String((b.payment as Record<string, unknown>).payment_method || ""),
      }
    : undefined;

  return {
    bill_id: b.bill_id,
    bill_number: b.bill_number,
    items_added: items,
    running_total: b.running_total,
    payment_status: b.payment_status,
    payment,
  };
}
