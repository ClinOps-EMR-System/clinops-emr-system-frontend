import { api } from './api';
import type {
  Admission,
  AdmissionFormData,
  AdmissionStats,
  AdmissionTransfer,
  TransferFormData,
  DischargeFormData,
  NotificationData,
} from '../types/admission';

const ENDPOINT = '/admissions';

function getToken(token?: string | null): string | null {
  if (token) return token;
  if (typeof window !== 'undefined') {
    return localStorage.getItem('clinops_token');
  }
  return null;
}

export const admissionsApi = {
  list(params?: Record<string, unknown>, token?: string | null): Promise<{ data: Admission[]; meta: Record<string, unknown> }> {
    const query = params
      ? '?' + new URLSearchParams(Object.entries(params) as [string, string][]).toString()
      : '';
    return api.get(`${ENDPOINT}${query}`, getToken(token)).then((res) => ({
      data: res.data?.data ?? res.data ?? [],
      meta: res.data?.meta ?? {},
    }));
  },

  getById(id: number, token?: string | null): Promise<Admission> {
    return api.get(`${ENDPOINT}/${id}`, getToken(token)).then((res) => res.data);
  },

  getByPatient(patientId: number, token?: string | null): Promise<Admission[]> {
    return api.get(`/patients/${patientId}/admissions`, getToken(token)).then((res) => res.data);
  },

  getByEncounter(encounterId: number, token?: string | null): Promise<Admission | null> {
    return api.get(`/encounters/${encounterId}/admission`, getToken(token)).then((res) => res.data).catch(() => null);
  },

  create(data: AdmissionFormData, token?: string | null): Promise<Admission> {
    return api.post(ENDPOINT, data, getToken(token)).then((res) => res.data);
  },

  update(id: number, data: Partial<AdmissionFormData>, token?: string | null): Promise<Admission> {
    return api.put(`${ENDPOINT}/${id}`, data, getToken(token)).then((res) => res.data);
  },

  transfer(id: number, data: TransferFormData, token?: string | null): Promise<Admission> {
    return api.post(`${ENDPOINT}/${id}/transfer`, data, getToken(token)).then((res) => res.data);
  },

  getTransfers(id: number, token?: string | null): Promise<AdmissionTransfer[]> {
    return api.get(`${ENDPOINT}/${id}/transfers`, getToken(token)).then((res) => res.data ?? []);
  },

  discharge(id: number, data: DischargeFormData, token?: string | null): Promise<Admission> {
    return api.post(`${ENDPOINT}/${id}/discharge`, data, getToken(token)).then((res) => res.data);
  },

  remove(id: number, token?: string | null): Promise<null> {
    return api.delete(`${ENDPOINT}/${id}`, getToken(token)).then(() => null);
  },

  getStats(token?: string | null): Promise<AdmissionStats> {
    return api.get(`${ENDPOINT}/stats`, getToken(token)).then((res) => res.data);
  },

  getNotifications(admissionId?: number, token?: string | null): Promise<NotificationData[]> {
    const params = admissionId ? `?admission_id=${admissionId}` : '';
    return api.get(`/notifications${params}`, getToken(token)).then((res) => res.data ?? []);
  },

  markNotificationRead(id: number, token?: string | null): Promise<NotificationData> {
    return api.put(`/notifications/${id}`, { read: true, read_at: new Date().toISOString() }, getToken(token)).then((res) => res.data);
  },
};