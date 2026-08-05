export interface BillSummary {
  id: number;
  bill_number: string;
  total_amount: number;
  paid_amount: number;
  balance: number;
  payment_status: string;
  created_at: string;
}

export interface BillItemLine {
  id: number;
  item_name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface BillDetail extends BillSummary {
  items: BillItemLine[];
}

export interface ReceiptPayment {
  id: number;
  payment_number: string | null;
  amount_paid: number;
  payment_method: string;
  payment_reference: string | null;
  received_by: { id: number; name: string } | null;
  created_at: string | null;
  status: string | null;
  paychangu_charge_id: string | null;
  paychangu_trans_id: string | null;
}

export interface ReceiptData {
  bill_id: number;
  bill_number: string;
  created_at: string | null;
  payment_status: string | null;
  total_amount: number;
  paid_amount: number;
  balance: number;
  patient: { id: number; hospital_number: string; first_name: string; last_name: string } | null;
  items: Array<{ id: number; item_name: string; quantity: number; unit_price: number; total: number }>;
  payments: ReceiptPayment[];
  issued_by: { id: number; name: string } | null;
}
