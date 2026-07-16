export interface Patient {
  id: number;
  hospital_number: string;
  first_name: string;
  last_name: string;
  gender: string;
  patient_category: string;
  village: string;
  district: string;
  created_at: string;
  registration_completed_at: string | null;
}
