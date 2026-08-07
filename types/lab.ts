export interface LabResult {
  id: number;
  lab_request_id: number;
  result_value_numeric: number | null;
  result_value_text: string | null;
  unit: string | null;
  reference_range: string | null;
  is_abnormal: boolean;
  is_critical: boolean;
  status: string;
  released_at: string | null;
  released_by: { id: number; name: string } | null;
  lab_request?: { id: number; test_name: string; loinc_code: string | null; status: string };
}

export interface LabOrder {
  id: number;
  order_type: string;
  status: string;
}
