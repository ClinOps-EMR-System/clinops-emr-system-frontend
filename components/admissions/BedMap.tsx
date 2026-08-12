"use client";

import type { WardSummary as Ward } from "../../types/admission";
import type { Admission } from "../../types/admission";
import StatusBadge from "../ui/StatusBadge";

interface BedMapProps {
  ward: Ward;
  admissions: Admission[];
  onBedClick?: (bedId: number) => void;
}

export function BedMap({ ward, admissions, onBedClick }: BedMapProps) {
  const beds = Array.from({ length: ward.total_beds }, (_, i) => {
    const bedNumber = String(i + 1);
    const admission = admissions.find((a) => a.bed?.bed_number === bedNumber);
    return { bedNumber, admission };
  });

  return (
    <div className="bg-white rounded border border-gray-200/50 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900">{ward.name}</h3>
        <StatusBadge label={ward.ward_type} variant="info" />
      </div>
      <div className="grid grid-cols-4 gap-2">
        {beds.map(({ bedNumber, admission }) => (
          <button
            key={bedNumber}
            onClick={() => admission && onBedClick?.(admission.bed_id!)}
            className={`p-3 rounded border text-center transition-all ${
              admission
                ? admission.status === "Admitted"
                  ? "bg-clinical-primary/10 border-clinical-primary text-clinical-primary hover:bg-clinical-primary/20"
                  : admission.status === "Discharged"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                    : "bg-amber-50 border-amber-200 text-amber-700"
                : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
            }`}
          >
            <p className="text-xs font-bold">Bed {bedNumber}</p>
            {admission ? (
              <p className="text-[10px] mt-1 truncate" title={admission.patient?.first_name + " " + admission.patient?.last_name}>
                {admission.patient?.first_name} {admission.patient?.last_name}
              </p>
            ) : (
              <p className="text-[10px] mt-1">Available</p>
            )}
          </button>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-clinical-primary/20 border border-clinical-primary inline-block"></span> Occupied
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-emerald-50 border border-emerald-200 inline-block"></span> Discharged
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-white border border-gray-200 inline-block"></span> Available
        </span>
      </div>
    </div>
  );
}