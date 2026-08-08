export interface Patient {
  id: number;
  hospital_number: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  phone: string;
  patient_category: string;
  national_id?: string;
  health_passport_number?: string;
  address?: string;
  village?: string;
  traditional_authority?: string;
  district?: string;
  guardian_name?: string;
  guardian_phone?: string;
  next_of_kin_relationship?: string;
  insurance_provider?: string;
  insurance_policy_number?: string;
  preferred_language?: string;
  marital_status?: string;
  occupation?: string;
  referral_source?: string;
  consent_care?: boolean;
  consent_teaching?: boolean;
  consent_research?: boolean;
  created_at?: string;
  registration_completed_at?: string | null;
  creator?: { id: number; name: string };
  encounters?: Encounter[];
}

export interface Encounter {
  id: number;
  encounter_type: string;
  status: string;
  triage_completed_at?: string | null;
  triage_priority?: number | null;
  chief_complaint?: string;
  visit_date?: string;
  created_at?: string;
}

export interface Allergy {
  id: number;
  allergen: string;
  severity: string;
  reaction?: string;
  allergy_type?: string | null;
  atc_code?: string | null;
}

export type DuplicateConfidence = "High" | "Medium" | "Low";

export interface DuplicatePatient {
  id: number;
  hospital_number: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender?: string | null;
  phone?: string | null;
  village: string;
  district: string;
  score?: number;
  confidence?: DuplicateConfidence;
  match_reasons?: string[];
}

export interface DuplicateCheckResponse {
  summary: {
    total: number;
    high: number;
    medium: number;
    low: number;
  };
  matches: DuplicatePatient[];
}
