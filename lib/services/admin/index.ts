import { getApiBaseUrl } from "@/lib/config";
import { api } from "@/lib/api";
import type {
  AdminOverview,
  AdminPermission,
  AdminRole,
  AdminUser,
  AuditLogEntry,
  BillableService,
  Cadre,
  ControlledSubstanceLog,
  Department,
  Drug,
  HospitalSettings,
  LoincCode,
  PaginationMeta,
  Rank,
  Ward,
} from "@/types/admin";

export interface PayChanguOperator {
  id: number;
  name: string;
  ref_id: string;
  short_code: string;
}

export interface PayChanguChargeBody {
  mobile: string;
  operator_ref_id: string;
  amount: number;
  email?: string;
  first_name?: string;
  last_name?: string;
}

export interface PayChanguChargeResult {
  charge_id: string;
  trans_id: string;
  status: string;
  currency: string;
  amount: number;
  mobile: string;
  operator: string;
  payment_id: number;
}

export interface PayChanguVerifyResult {
  status: string;
  amount: number | null;
  completed_at: string | null;
  operator: string | null;
  currency: string;
}

function unwrap<T>(res: unknown): T {
  if (res && typeof res === "object" && "data" in res) {
    return (res as { data: T }).data;
  }
  return res as T;
}

export async function downloadAuthenticated(
  endpoint: string,
  token: string | null,
  filename: string,
) {
  const headers: HeadersInit = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${getApiBaseUrl()}${endpoint}`, { headers });
  if (!response.ok) {
    throw new Error("Download failed.");
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const adminApi = {
  overview: async (token: string | null) =>
    unwrap<AdminOverview>(await api.get("/admin/overview", token)),

  listUsers: async (
    token: string | null,
    params: Record<string, string | number | boolean | undefined> = {},
  ) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") qs.set(k, String(v));
    });
    const q = qs.toString();
    const res = await api.get(`/users${q ? `?${q}` : ""}`, token);
    return {
      data: unwrap<AdminUser[]>(res) ?? [],
      meta: (res as { meta?: Record<string, number> }).meta,
    };
  },

  getUser: async (token: string | null, id: number | string) =>
    unwrap<AdminUser>(await api.get(`/users/${id}`, token)),

  createUser: async (token: string | null, body: Record<string, unknown>) =>
    unwrap<AdminUser>(await api.post("/users", body, token)),

  updateUser: async (
    token: string | null,
    id: number | string,
    body: Record<string, unknown>,
  ) => unwrap<AdminUser>(await api.put(`/users/${id}`, body, token)),

  deleteUser: async (token: string | null, id: number | string) =>
    api.delete(`/users/${id}`, token),

  syncUserRoles: async (
    token: string | null,
    id: number | string,
    roles: string[],
  ) =>
    unwrap<AdminUser>(
      await api.put(`/users/${id}/roles`, { roles }, token),
    ),

  listCadres: async (token: string | null) =>
    unwrap<Cadre[]>(await api.get("/cadres", token)) ?? [],

  listCadreRanks: async (token: string | null, cadreId: number | string) =>
    unwrap<Rank[]>(await api.get(`/cadres/${cadreId}/ranks`, token)) ?? [],

  assignSupervisor: async (
    token: string | null,
    userId: number | string,
    supervisorId: number | null,
  ) =>
    unwrap<AdminUser>(
      await api.put(`/users/${userId}/supervisor`, {
        supervisor_id: supervisorId,
      }, token),
    ),

  getSupervision: async (token: string | null, userId: number | string) =>
    unwrap<{ supervisor: AdminUser | null; supervisees: AdminUser[] }>(
      await api.get(`/users/${userId}/supervision`, token),
    ),

  listRoles: async (token: string | null) =>
    unwrap<AdminRole[]>(await api.get("/roles", token)) ?? [],

  getRole: async (token: string | null, id: number | string) =>
    unwrap<AdminRole>(await api.get(`/roles/${id}`, token)),

  createRole: async (token: string | null, body: { name: string; description?: string }) =>
    unwrap<AdminRole>(await api.post("/roles", body, token)),

  updateRole: async (
    token: string | null,
    id: number | string,
    body: { name: string; description?: string },
  ) => unwrap<AdminRole>(await api.put(`/roles/${id}`, body, token)),

  deleteRole: async (token: string | null, id: number | string) =>
    api.delete(`/roles/${id}`, token),

  syncRolePermissions: async (
    token: string | null,
    id: number | string,
    permissions: string[],
  ) =>
    unwrap<AdminRole>(
      await api.post(`/roles/${id}/permissions`, { permissions }, token),
    ),

  listPermissions: async (token: string | null) =>
    unwrap<AdminPermission[]>(await api.get("/permissions", token)) ?? [],

  listAuditLogs: async (
    token: string | null,
    params: Record<string, string | number | undefined> = {},
  ) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") qs.set(k, String(v));
    });
    const q = qs.toString();
    const res = await api.get(`/audit-logs${q ? `?${q}` : ""}`, token);
    return {
      data: unwrap<AuditLogEntry[]>(res) ?? [],
      meta: (res as { meta?: Record<string, number> }).meta,
    };
  },

  exportAuditLogs: (token: string | null, params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return downloadAuthenticated(
      `/audit-logs/export${qs ? `?${qs}` : ""}`,
      token,
      "audit-logs.csv",
    );
  },

  patientTimeline: async (
    token: string | null,
    patientId: number | string,
    params: Record<string, string | number | undefined> = {},
  ) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") qs.set(k, String(v));
    });
    const q = qs.toString();
    const res = await api.get(`/audit-logs/patient/${patientId}${q ? `?${q}` : ""}`, token);
    return {
      data: unwrap<AuditLogEntry[]>(res) ?? [],
      meta: (res as { meta?: PaginationMeta }).meta,
    };
  },

  userActivity: async (
    token: string | null,
    userId: number | string,
    params: Record<string, string | number | undefined> = {},
  ) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") qs.set(k, String(v));
    });
    const q = qs.toString();
    const res = await api.get(`/audit-logs/user/${userId}${q ? `?${q}` : ""}`, token);
    return {
      data: unwrap<AuditLogEntry[]>(res) ?? [],
      meta: (res as { meta?: PaginationMeta }).meta,
    };
  },

  timeline: async (
    token: string | null,
    params: Record<string, string | number | undefined> = {},
  ) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") qs.set(k, String(v));
    });
    const q = qs.toString();
    const res = await api.get(`/audit-logs/timeline${q ? `?${q}` : ""}`, token);
    return {
      data: unwrap<AuditLogEntry[]>(res) ?? [],
      meta: (res as { meta?: PaginationMeta }).meta,
    };
  },

  listDepartments: async (token: string | null) =>
    unwrap<Department[]>(await api.get("/departments", token)) ?? [],

  createDepartment: async (token: string | null, body: Record<string, unknown>) =>
    unwrap<Department>(await api.post("/departments", body, token)),

  updateDepartment: async (
    token: string | null,
    id: number | string,
    body: Record<string, unknown>,
  ) => unwrap<Department>(await api.put(`/departments/${id}`, body, token)),

  deleteDepartment: async (token: string | null, id: number | string) =>
    api.delete(`/departments/${id}`, token),

  listWards: async (token: string | null) =>
    unwrap<Ward[]>(await api.get("/wards", token)) ?? [],

  createWard: async (token: string | null, body: Record<string, unknown>) =>
    unwrap<Ward>(await api.post("/wards", body, token)),

  updateWard: async (
    token: string | null,
    id: number | string,
    body: Record<string, unknown>,
  ) => unwrap<Ward>(await api.put(`/wards/${id}`, body, token)),

  deleteWard: async (token: string | null, id: number | string) =>
    api.delete(`/wards/${id}`, token),

  listServices: async (
    token: string | null,
    params: Record<string, string | number | undefined> = {},
  ) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") qs.set(k, String(v));
    });
    const q = qs.toString();
    const res = await api.get(`/services${q ? `?${q}` : ""}`, token);
    return {
      data: unwrap<BillableService[]>(res) ?? [],
      meta: (res as { meta?: Record<string, number> }).meta,
    };
  },

  createService: async (token: string | null, body: Record<string, unknown>) =>
    unwrap<BillableService>(await api.post("/services", body, token)),

  updateService: async (
    token: string | null,
    id: number | string,
    body: Record<string, unknown>,
  ) => unwrap<BillableService>(await api.put(`/services/${id}`, body, token)),

  deleteService: async (token: string | null, id: number | string) =>
    api.delete(`/services/${id}`, token),

  searchLoinc: async (token: string | null, q: string) =>
    (await api.get(`/loinc/search?q=${encodeURIComponent(q)}`, token)) as LoincCode[],

  getSettings: async (token: string | null) =>
    unwrap<HospitalSettings>(await api.get("/settings", token)),

  updateSettings: async (token: string | null, body: Record<string, unknown>) =>
    unwrap<HospitalSettings>(await api.put("/settings", body, token)),

  getPublicConfig: async () =>
    unwrap<{ signup_enabled: boolean; hospital_name: string }>(
      await api.get("/config/public"),
    ),

  logout: async (token: string | null) => api.post("/logout", {}, token),

  // Controlled Substance Audit Trail
  csLogs: async (
    token: string | null,
    params: Record<string, string | number | undefined> = {},
  ) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") qs.set(k, String(v));
    });
    const q = qs.toString();
    const res = await api.get(`/controlled-substances/logs${q ? `?${q}` : ""}`, token);
    return {
      data: unwrap<ControlledSubstanceLog[]>(res) ?? [],
      meta: (res as { meta?: PaginationMeta }).meta,
    };
  },

  csDrugTrail: async (
    token: string | null,
    drugId: number | string,
    params: Record<string, string | number | undefined> = {},
  ) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") qs.set(k, String(v));
    });
    const q = qs.toString();
    const res = await api.get(`/controlled-substances/drug/${drugId}${q ? `?${q}` : ""}`, token);
    return {
      data: unwrap<ControlledSubstanceLog[]>(res) ?? [],
      meta: (res as { meta?: PaginationMeta }).meta,
    };
  },

  csPatientHistory: async (
    token: string | null,
    patientId: number | string,
  ) => {
    const res = await api.get(`/controlled-substances/patient/${patientId}`, token);
    return {
      data: unwrap<ControlledSubstanceLog[]>(res) ?? [],
      meta: (res as { meta?: PaginationMeta }).meta,
    };
  },

  csLogEvent: async (token: string | null, body: Record<string, unknown>) =>
    unwrap<ControlledSubstanceLog>(
      await api.post("/controlled-substances/logs", body, token),
    ),

  csReconcile: async (token: string | null, body: { drug_id: number; physical_count: number; notes: string }) =>
    unwrap<ControlledSubstanceLog>(
      await api.post("/controlled-substances/reconcile", body, token),
    ),

  csDiscrepancies: async (token: string | null) => {
    const res = await api.get("/controlled-substances/discrepancies", token);
    return unwrap<ControlledSubstanceLog[]>(res) ?? [];
  },

  csReport: async (token: string | null, from: string, to: string) => {
    const res = await api.get(`/controlled-substances/report?from=${from}&to=${to}`, token);
    return unwrap<ControlledSubstanceLog[]>(res) ?? [];
  },

  // Drugs
  listDrugs: async (
    token: string | null,
    params: Record<string, string | number | undefined> = {},
  ) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") qs.set(k, String(v));
    });
    const q = qs.toString();
    const res = await api.get(`/drugs${q ? `?${q}` : ""}`, token);
    return {
      data: unwrap<Drug[]>(res) ?? [],
      meta: (res as { meta?: PaginationMeta }).meta,
    };
  },

  searchDrugs: async (token: string | null, q: string) =>
    unwrap<Drug[]>(await api.get(`/drugs/search?q=${encodeURIComponent(q)}`, token)) ?? [],

  // Research Data Export
  exportResearchData: async (
    token: string | null,
    body: {
      format: "csv" | "json";
      fields: string[];
      filters?: {
        date_from?: string;
        date_to?: string;
        department?: string;
        patient_category?: string;
      };
    },
  ) => {
    const headers: HeadersInit = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${getApiBaseUrl()}/research/export`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || "Export failed");
    }
    if (body.format === "csv") {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `research_export_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      return null;
    }
    return res.json();
  },

  exportStaffRoster: (token: string | null) =>
    downloadAuthenticated(
      "/admin/reports/staff-roster",
      token,
      "staff-roster.csv",
    ),

  exportAuditSummary: (token: string | null) =>
    downloadAuthenticated(
      "/admin/reports/audit-summary",
      token,
      "audit-summary.csv",
    ),

  getPayChanguOperators: async (token: string | null) =>
    unwrap<{ operators: PayChanguOperator[] }>(
      await api.get("/paychangu/operators", token),
    ),

  initializePayChanguPayment: async (
    token: string | null,
    billId: number | string,
    body: PayChanguChargeBody,
  ) =>
    unwrap<PayChanguChargeResult>(
      await api.post(`/bills/${billId}/pay/charge`, body, token),
    ),

  verifyPayChanguPayment: async (
    token: string | null,
    billId: number | string,
    chargeId: string,
  ) =>
    unwrap<PayChanguVerifyResult>(
      await api.get(`/bills/${billId}/pay/${chargeId}/status`, token),
    ),
};
