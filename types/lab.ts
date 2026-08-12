export interface LabSpecimenType {
  id: number;
  name: string;
  container_type: string | null;
  description: string | null;
  active: boolean;
}

export interface LabTestCategory {
  id: number;
  name: string;
  code: string;
  display_order: number;
  active: boolean;
}

export interface LabTestComponent {
  id: number;
  lab_test_id: number;
  code: string;
  name: string;
  result_type: 'NUMERIC' | 'QUALITATIVE' | 'ORDINAL' | 'CODED' | 'TEXT' | 'NARRATIVE' | 'RATIO' | 'COUNT' | 'PERCENTAGE' | 'TITRE';
  unit: string | null;
  reference_range: string | null;
  display_order: number;
  required: boolean;
  active: boolean;
  reference_ranges?: LabReferenceRange[];
}

export interface LabReferenceRange {
  id: number;
  component_id: number;
  sex: string | null;
  age_min_days: number;
  age_max_days: number;
  lower_value: number | null;
  upper_value: number | null;
  text_reference: string | null;
  critical_low: number | null;
  critical_high: number | null;
  effective_from: string | null;
  effective_to: string | null;
}

export interface LabTest {
  id: number;
  code: string;
  name: string;
  category_id: number;
  specimen_type_id: number | null;
  description: string | null;
  result_type: 'PANEL' | 'SINGLE' | 'NARRATIVE';
  is_panel: boolean;
  loinc_code: string | null;
  active: boolean;
  category?: LabTestCategory;
  specimen_type?: LabSpecimenType;
  components?: LabTestComponent[];
}

export interface LabResultValue {
  id?: number;
  component_id: number;
  numeric_value: number | null;
  text_value: string | null;
  coded_value: string | null;
  unit: string | null;
  reference_low: number | null;
  reference_high: number | null;
  reference_text: string | null;
  abnormal_flag: string | null;
  critical_flag: string | null;
  method: string | null;
  display_order: number;
  component?: LabTestComponent;
}

export interface LabResult {
  id: number;
  lab_request_id: number;
  result_value_numeric: number | null;
  result_value_text: string | null;
  unit: string | null;
  reference_range: string | null;
  is_abnormal: boolean;
  is_critical: boolean;
  specimen_quality: string | null;
  clinical_comment: string | null;
  interpretation: string | null;
  status: string;
  performed_at: string | null;
  verified_at: string | null;
  released_at: string | null;
  performed_by?: { id: number; name: string } | null;
  verified_by?: { id: number; name: string } | null;
  released_by?: { id: number; name: string } | null;
  lab_request?: {
    id: number;
    test_name: string;
    loinc_code: string | null;
    lab_test_id: number | null;
    ordered_by?: number | null;
    status: string;
    lab_test?: LabTest;
  };
  component_values?: LabResultValue[];
}

export interface LabOrder {
  id: number;
  patient_id?: number;
  encounter_id?: number;
  order_type: string;
  clinical_indication: string | null;
  priority: string;
  status: string;
  created_at: string;
  patient?: {
    first_name: string;
    last_name: string;
    hospital_number: string;
  };
  lab_request?: {
    id: number;
    test_name: string;
    loinc_code: string | null;
    lab_test_id: number | null;
    specimen_type: string | null;
    status: string;
    lab_test?: LabTest;
  };
}

export interface LabResultEvent {
  event: string;
  lab_result_id: number;
  lab_request_id: number;
  encounter_id: number;
  patient_id: number | null;
  result_value: string | null;
  unit: string | null;
  is_critical: boolean;
  is_abnormal: boolean;
  status: string;
  color: string | null;
  priority: string | null;
  occurred_at: string;
}
