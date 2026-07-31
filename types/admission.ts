export interface Admission {
  id: number;
  patient_id: number;
  encounter_id: number | null;
  admission_date: string;
  admission_type: 'Emergency' | 'Elective';
  admission_diagnosis: string | null;
  ward_id: number | null;
  bed_id: number | null;
  acuity_level: 'Critical' | 'High' | 'Medium' | 'Low' | null;
  isolation_required: boolean;
  discharge_date: string | null;
  discharge_diagnosis: string | null;
  discharge_summary: string | null;
  transfer_notes: string | null;
  length_of_stay_days: number | null;
  status: 'Admitted' | 'Discharged' | 'Transferred';
  admitted_by: number;
  created_at: string;
  updated_at: string;
  patient?: PatientSummary;
  encounter?: EncounterSummary;
  ward?: WardSummary;
  bed?: BedSummary;
  admittedBy?: { id: number; name: string };
}

export interface PatientSummary {
  id: number;
  first_name: string;
  last_name: string;
  hospital_number: string;
  date_of_birth: string;
  gender: string;
}

export interface EncounterSummary {
  id: number;
  encounter_type: string;
  status: string;
  chief_complaint: string;
  visit_date: string;
}

export interface WardSummary {
  id: number;
  name: string;
  code: string;
  ward_type: string;
  total_beds: number;
}

export interface BedSummary {
  id: number;
  bed_number: string;
  occupancy_status: string;
}

export interface AdmissionFormData {
  patient_id: string;
  encounter_id: string;
  ward_id: string;
  bed_id: string;
  admission_type: 'Emergency' | 'Elective';
  admission_diagnosis: string;
  acuity_level: 'Critical' | 'High' | 'Medium' | 'Low';
  isolation_required: boolean;
  admission_date?: string;
}

export interface TransferFormData {
  ward_id: string;
  bed_id: string;
  reason: string;
}

export interface AdmissionTransfer {
  id: number;
  admission_id: number;
  from_ward_id: number | null;
  from_bed_id: number | null;
  to_ward_id: number;
  to_bed_id: number;
  reason: string | null;
  transferred_by: number | null;
  transferred_by_name: string | null;
  transferred_at: string;
  from_ward?: WardSummary | null;
  from_bed?: BedSummary | null;
  to_ward?: WardSummary;
  to_bed?: BedSummary;
}

export interface DischargeFormData {
  discharge_date: string;
  discharge_diagnosis: string | null;
  discharge_summary: string | null;
}

export interface AdmissionStats {
  active_admissions: number;
  today_admissions: number;
  today_discharges: number;
  bed_occupancy: {
    total: number;
    occupied: number;
    available: number;
    rate: number;
  };
  isolation_patients: number;
  by_ward: Record<string, number>;
  by_acuity: Record<string, number>;
  by_admission_type: Record<string, number>;
}

export interface NotificationData {
  id: number;
  user_id: number;
  admission_id: number | null;
  patient_id: number | null;
  type: string;
  title: string;
  message: string;
  channel: string;
  read: boolean;
  read_at: string | null;
  created_at: string;
}