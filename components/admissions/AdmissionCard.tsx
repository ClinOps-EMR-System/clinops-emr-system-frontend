"use client";

import Link from "next/link";
import type { Admission } from "../../types/admission";
import StatusBadge from "../ui/StatusBadge";

interface AdmissionCardProps {
  admission: Admission;
  onDischarge?: (id: number) => void;
  onTransfer?: (id: number) => void;
}

export function AdmissionCard({ admission, onDischarge, onTransfer }: AdmissionCardProps) {
  return (
    <div className="bg-white rounded border border-gray-200/50 p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-gray-900">
            {admission.patient?.first_name} {admission.patient?.last_name}
          </h3>
          <p className="text-xs text-gray-500 font-mono">
            #{admission.patient?.hospital_number}
          </p>
        </div>
        <StatusBadge
          label={admission.status}
          variant={
            admission.status === "Admitted"
              ? "info"
              : admission.status === "Discharged"
                ? "success"
                : "warning"
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <span className="text-gray-500 font-medium uppercase tracking-wide">Ward</span>
          <p className="text-gray-700 font-semibold">
            {admission.ward?.name} / Bed {admission.bed?.bed_number}
          </p>
        </div>
        <div>
          <span className="text-gray-500 font-medium uppercase tracking-wide">Type</span>
          <p className="text-gray-700 font-semibold">{admission.admission_type}</p>
        </div>
        <div>
          <span className="text-gray-500 font-medium uppercase tracking-wide">Diagnosis</span>
          <p className="text-gray-700 truncate">{admission.admission_diagnosis || "-"}</p>
        </div>
        <div>
          <span className="text-gray-500 font-medium uppercase tracking-wide">Acuity</span>
          <p className="text-gray-700 font-semibold">{admission.acuity_level}</p>
        </div>
        <div>
          <span className="text-gray-500 font-medium uppercase tracking-wide">Admitted</span>
          <p className="text-gray-700 font-mono">
            {new Date(admission.admission_date).toLocaleDateString()}
          </p>
        </div>
        <div>
          <span className="text-gray-500 font-medium uppercase tracking-wide">Isolation</span>
          <p className="text-gray-700">
            {admission.isolation_required ? (
              <span className="text-red-600 font-bold">Yes</span>
            ) : (
              <span className="text-gray-300">No</span>
            )}
          </p>
        </div>
      </div>

      {admission.length_of_stay_days !== null && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <span className="text-xs text-gray-500">LOS: </span>
          <span className="text-xs font-semibold text-gray-600">
            {admission.length_of_stay_days} day
            {admission.length_of_stay_days !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 pt-3 border-t border-gray-100">
        <Link
          href={`/patients/${admission.patient_id}`}
          className="text-xs font-bold text-teal-600 hover:text-teal-800 uppercase tracking-wider"
        >
          View Patient
        </Link>
        {onTransfer && (
          <button
            onClick={() => onTransfer(admission.id)}
            className="text-xs font-bold text-amber-600 hover:text-amber-800 uppercase tracking-wider"
          >
            Transfer
          </button>
        )}
        {onDischarge && !admission.discharge_date && (
          <button
            onClick={() => onDischarge(admission.id)}
            className="text-xs font-bold text-clinical-primary hover:text-clinical-primary-hover uppercase tracking-wider"
          >
            Discharge
          </button>
        )}
      </div>
    </div>
  );
}