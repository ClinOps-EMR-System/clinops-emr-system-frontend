export interface Cadre {
  id: number;
  name: string;
  code: string;
  default_role?: string | null;
  description?: string | null;
  is_active: boolean;
  ranks?: Rank[];
}

export interface Rank {
  id: number;
  cadre_id: number;
  name: string;
  code: string;
  grade: number;
  can_sign_off: boolean;
  is_supervisor: boolean;
}

export interface AdminUser {
  id: number;
  name: string;
  username: string;
  email: string;
  is_active: boolean;
  last_login?: string | null;
  roles?: { id: number; name: string }[];
  department?: { id: number; name: string } | null;
  cadre?: { id: number; name: string; code?: string; default_role?: string } | null;
  rank?: { id: number; name: string; grade?: number } | null;
  supervisor?: { id: number; name: string; email?: string } | null;
  created_at?: string;
}

export interface AdminRole {
  id: number;
  name: string;
  description?: string | null;
  permissions?: { id: number; name: string }[];
}

export interface AdminPermission {
  id: number;
  name: string;
}

export interface Department {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  is_active: boolean;
}

export interface Ward {
  id: number;
  name: string;
  code: string;
  ward_type: string;
  total_beds: number;
  daily_charge?: string | number;
  beds_count?: number;
  available_beds?: number;
}

export interface Bed {
  id: number;
  ward_id: number;
  bed_number?: string;
  occupancy_status: "Available" | "Occupied" | "Cleaning";
  ward?: Ward;
}

export interface BillableService {
  id: number;
  code: string;
  name: string;
  category?: string | null;
  billing_unit?: string | null;
  unit_price: string | number;
}

export interface LoincCode {
  code: string;
  display_name: string;
  component_name?: string | null;
  system?: string | null;
}

export interface AuditLogEntry {
  id: number;
  user_id?: number | null;
  action: string;
  event?: string | null;
  auditable_type: string;
  auditable_id?: string | number | null;
  old_values?: Record<string, unknown> | null;
  new_values?: Record<string, unknown> | null;
  context?: Record<string, unknown> | null;
  patient_id?: number | null;
  encounter_id?: number | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
  user?: { id: number; name: string; email: string; role?: string | null } | null;
}

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface HospitalSettings {
  hospital_name: string;
  address: string;
  phone: string;
  timezone: string;
  logo_url: string;
  signup_enabled: boolean;
}

export interface AdminOverview {
  staff_active: number;
  staff_inactive: number;
  staff_by_role: { role: string; count: number }[];
  audit_last_24h: number;
  departments_count: number;
  recent_audit: AuditLogEntry[];
}

export const ADMIN_PERMISSIONS = [
  "user.manage",
  "role.manage",
  "audit.view",
  "department.manage",
  "settings.manage",
  "catalog.manage",
  "ward.view",
  "ward.edit",
  "report.view",
] as const;

export type AdminPermissionName = (typeof ADMIN_PERMISSIONS)[number];
