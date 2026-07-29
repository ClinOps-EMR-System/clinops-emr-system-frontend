export interface Step {
  id: number;
  label: string;
  description: string;
}

export const STANDARD_STEPS: Step[] = [
  { id: 0, label: "Personal Info", description: "Name, gender & date of birth" },
  { id: 1, label: "Contact & Location", description: "Phone, address & district" },
  { id: 2, label: "Next of Kin & Social", description: "Guardian, language & occupation" },
  { id: 3, label: "Insurance & Consent", description: "Coverage, permissions & review" },
];

export const EMERGENCY_STEPS: Step[] = [
  { id: 0, label: "Emergency Details", description: "Identity & presenting complaint" },
  { id: 1, label: "Consent & Submit", description: "Permissions & finalize" },
];

export const MALAWI_DISTRICTS = [
  "Balaka", "Blantyre", "Chikwawa", "Chiradzulu", "Chitipa",
  "Dedza", "Dowa", "Karonga", "Kasungu", "Likoma",
  "Lilongwe", "Machinga", "Mangochi", "Mchinji", "Mulanje",
  "Mwanza", "Mzimba", "Ncheu", "Nkhata Bay", "Nkhotakota",
  "Nsanje", "Ntcheu", "Ntchisi", "Phalombe", "Rumphi",
  "Salima", "Thyolo", "Zomba",
];

export const KIN_RELATIONSHIPS = [
  { value: "", label: "Select relationship" },
  { value: "Mother", label: "Mother" },
  { value: "Father", label: "Father" },
  { value: "Spouse", label: "Spouse" },
  { value: "Sibling", label: "Sibling" },
  { value: "Child", label: "Child" },
  { value: "Other", label: "Other" },
];

export const LANGUAGES = [
  { value: "Chichewa", label: "Chichewa" },
  { value: "Tumbuka", label: "Tumbuka" },
  { value: "Yao", label: "Yao" },
  { value: "English", label: "English" },
  { value: "Other", label: "Other" },
];

export const MARITAL_STATUSES = [
  { value: "", label: "Select status" },
  { value: "Single", label: "Single" },
  { value: "Married", label: "Married" },
  { value: "Divorced", label: "Divorced" },
  { value: "Widowed", label: "Widowed" },
];

export const REFERRAL_SOURCES = [
  { value: "Self", label: "Self (Walk-in)" },
  { value: "CHW", label: "Community Health Worker" },
  { value: "Health Center", label: "Health Center" },
  { value: "Other Facility", label: "Other Facility" },
];

export const GENDERS = [
  { value: "Female", label: "Female" },
  { value: "Male", label: "Male" },
  { value: "Other", label: "Other" },
];

export const CATEGORIES = [
  { value: "Outpatient", label: "Outpatient" },
  { value: "Inpatient", label: "Inpatient" },
  { value: "Student", label: "Student (MUST)" },
  { value: "Staff", label: "Staff" },
];

export interface FormData {
  firstName: string;
  lastName: string;
  dob: string;
  gender: string;
  phone: string;
  nationalId: string;
  healthPassport: string;
  address: string;
  village: string;
  ta: string;
  district: string;
  guardianName: string;
  guardianPhone: string;
  category: string;
  consentCare: boolean;
  consentTeaching: boolean;
  consentResearch: boolean;
  insuranceProvider: string;
  insurancePolicy: string;
  preferredLanguage: string;
  maritalStatus: string;
  occupation: string;
  referralSource: string;
  nextOfKinRelationship: string;
  approximateAge: string;
  presentingComplaint: string;
}
