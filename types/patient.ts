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
}

export interface Allergy {
  id: number;
  allergen: string;
  severity: string;
  reaction?: string;
}

export interface DuplicatePatient {
  id: number;
  hospital_number: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  village: string;
  district: string;
}
