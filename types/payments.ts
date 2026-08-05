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
