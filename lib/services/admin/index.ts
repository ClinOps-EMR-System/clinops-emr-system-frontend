import { getApiBaseUrl } from "@/lib/config";
import { api } from "@/lib/api";
import type {
  AdminOverview,
  AdminPermission,
  AdminRole,
  AdminUser,
  AuditLogEntry,
  BillableService,
  Department,
  HospitalSettings,
  LoincCode,
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
