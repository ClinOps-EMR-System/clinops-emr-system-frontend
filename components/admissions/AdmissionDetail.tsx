"use client";

import type { Admission } from "../../types/admission";
import StatusBadge from "../ui/StatusBadge";

interface AdmissionDetailProps {
  admission: Admission;
  onClose: () => void;
}

export function AdmissionDetail({ admission, onClose }: AdmissionDetailProps) {
  return (
    <div className="bg-white rounded border border-gray-200/50 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Admission Details</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          aria-label="Close"
        >
          &times;
        </button>
      </div>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <StatusBadge label={admission.status} variant="info" />
          <div className="text-xs text-gray-400 font-mono">
            Admitted: {new Date(admission.admission_date).toLocaleString()}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider mb-1">Patient</h4>
            <p className="text-sm font-semibold text-gray-900">
              {admission.patient?.first_name} {admission.patient?.last_name}
            </p>
            <p className="text-xs text-gray-400 font-mono">
              #{admission.patient?.hospital_number}
            </p>
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider mb-1">Admission Type</h4>
            <p className="text-sm font-semibold text-gray-900">{admission.admission_type}</p>
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider mb-1">Ward</h4>
            <p className="text-sm font-semibold text-gray-900">{admission.ward?.name}</p>
            <p className="text-xs text-gray-400 font-mono">{admission.ward?.code}</p>
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider mb-1">Bed</h4>
            <p className="text-sm font-semibold text-gray-900">Bed {admission.bed?.bed_number}</p>
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider mb-1">Acuity</h4>
            <p className="text-sm font-semibold text-gray-900">{admission.acuity_level}</p>
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider mb-1">Isolation</h4>
            <p className="text-sm font-semibold text-gray-900">
              {admission.isolation_required ? "Required" : "Not Required"}
            </p>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider mb-1">Admission Diagnosis</h4>
          <p className="text-sm text-gray-700">{admission.admission_diagnosis || "—"}</p>
        </div>

        {admission.discharge_date && (
          <>
            <div>
              <h4 className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider mb-1">Discharged</h4>
              <p className="text-sm text-gray-700 font-mono">
                {new Date(admission.discharge_date).toLocaleDateString()}
              </p>
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider mb-1">Discharge Diagnosis</h4>
              <p className="text-sm text-gray-700">{admission.discharge_diagnosis || "—"}</p>
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider mb-1">Discharge Summary</h4>
              <p className="text-sm text-gray-700">{admission.discharge_summary || "—"}</p>
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider mb-1">Length of Stay</h4>
              <p className="text-sm font-semibold text-gray-900">
                {admission.length_of_stay_days} day{admission.length_of_stay_days !== 1 ? "s" : ""}
              </p>
            </div>
          </>
        )}

        {admission.transfer_notes && (
          <div>
            <h4 className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider mb-1">Transfer Notes</h4>
            <p className="text-sm text-gray-700">{admission.transfer_notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}