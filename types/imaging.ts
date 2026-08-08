export interface ImagingResult {
  id: number;
  imaging_request_id: number;
  technique: string | null;
  findings: string;
  impression: string;
  conclusion: string | null;
  is_critical: boolean;
  status: "Drafted" | "Released";
  image_url: string | null;
  reported_by: { id: number; name: string } | null;
  reported_at: string | null;
  released_by: { id: number; name: string } | null;
  released_at: string | null;
}

export interface ImagingRequest {
  id: number;
  encounter_id: number;
  order_id: number | null;
  imaging_type: string;
  body_site: string | null;
  clinical_indication: string | null;
  priority: "Routine" | "Urgent" | "Stat";
  status: string;
  requested_by: { id: number; name: string } | null;
  performed_by: { id: number; name: string } | null;
  performed_at: string | null;
  created_at: string;
  updated_at: string;
  result: ImagingResult | null;
}

export interface ImagingWorklistEntry {
  imaging_request_id: number;
  patient: {
    id: number;
    hospital_number: string;
    full_name: string;
  };
  encounter_id: number;
  imaging_type: string;
  body_site: string | null;
  clinical_indication: string | null;
  priority: "Routine" | "Urgent" | "Stat";
  status: "Requested" | "Performed" | "Cancelled" | "Completed";
  requested_by: string | null;
  performed_at: string | null;
  has_draft_report: boolean;
  report_status: "Drafted" | "Released" | null;
  is_critical: boolean;
  ordered_at: string;
}

export interface RadiologyRequestEvent {
  event: string;
  radiology_request_id: number;
  encounter_id: number;
  patient_id: number | null;
  imaging_type: string | null;
  body_site: string | null;
  clinical_indication: string | null;
  priority: string | null;
  status: string | null;
  requested_by: number | null;
  color: string | null;
  urgency: string | null;
  occurred_at: string;
}

export interface RadiologyResultEvent {
  event: string;
  radiology_result_id: number;
  imaging_request_id: number;
  encounter_id: number | null;
  patient_id: number | null;
  imaging_type: string | null;
  body_site: string | null;
  impression: string | null;
  findings: string | null;
  has_image: boolean;
  image_url: string | null;
  status: string | null;
  is_critical: boolean;
  occurred_at: string;
}
