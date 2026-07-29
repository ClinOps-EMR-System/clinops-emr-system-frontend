"use client";

import Link from "next/link";

interface QueuePatient {
  id?: number;
  patient: {
    id: number;
    first_name: string;
    last_name: string;
    hospital_number: string;
  };
  priority: number | string;
  entered_queue_at: string;
}

interface EmergencyWaitingPatient {
  patient_id: number;
  hospital_number: string;
  full_name: string;
  chief_complaint: string;
  arrived_at: string;
  wait_minutes: number;
}

function getWaitTime(enteredAt: string): string {
  const diff = Date.now() - new Date(enteredAt).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

function getWaitColor(enteredAt: string): string {
  const diff = Date.now() - new Date(enteredAt).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins > 30) return "text-red-600";
  if (mins > 10) return "text-amber-600";
  return "text-emerald-600";
}

function getPriorityColor(priority: number | string): string {
  const p = typeof priority === "string" ? (priority === "high" ? 1 : priority === "medium" ? 3 : 5) : priority;
  if (p <= 2) return "bg-red-100 text-red-800 border-red-200";
  if (p <= 3) return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-emerald-100 text-emerald-800 border-emerald-200";
}

function getPriorityLabel(priority: number | string): string {
  const p = typeof priority === "string" ? (priority === "high" ? 1 : priority === "medium" ? 3 : 5) : priority;
  if (p <= 2) return "HIGH";
  if (p <= 3) return "MED";
  return "LOW";
}

export function QueuePreview({ queue, emergencyWaiting }: { queue: QueuePatient[]; emergencyWaiting?: EmergencyWaitingPatient[] }) {
  const hasEmergencyWaiting = emergencyWaiting && emergencyWaiting.length > 0;
  const hasQueue = queue && queue.length > 0;

  if (!hasEmergencyWaiting && !hasQueue) {
    return (
      <div className="bg-white rounded border border-[#becab7]/50 p-6">
        <h3 className="text-sm font-bold text-[#5f5e5e] uppercase tracking-wider mb-3">Queue</h3>
        <p className="text-sm text-gray-400">No patients waiting</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded border border-[#becab7]/50 overflow-hidden">
      {/* Emergency Waiting Section */}
      {hasEmergencyWaiting && (
        <>
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-red-50/50">
            <div className="flex items-center">
              <div className="w-1.5 h-6 bg-red-500 rounded-full mr-3"></div>
              <h3 className="text-sm font-bold text-red-700 uppercase tracking-wider">Awaiting Triage</h3>
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">
                {emergencyWaiting.length}
              </span>
            </div>
            <Link href="/emergency-queue" className="text-xs font-bold text-clinical-primary hover:text-clinical-primary-hover uppercase tracking-wider">
              View All
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {emergencyWaiting.slice(0, 3).map((patient) => (
              <div key={patient.patient_id} className="px-6 py-3 flex items-center justify-between hover:bg-red-50/30 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold border bg-red-100 text-red-800 border-red-200">
                    ER
                  </span>
                  <div>
                    <Link href={`/patients/${patient.patient_id}`} className="text-sm font-semibold text-gray-900 hover:text-clinical-primary hover:underline">
                      {patient.full_name}
                    </Link>
                    <p className="text-xs text-gray-400 font-mono">{patient.hospital_number}</p>
                  </div>
                </div>
                <span className={`text-xs font-mono font-semibold ${patient.wait_minutes > 10 ? "text-red-600" : "text-emerald-600"}`}>
                  {patient.wait_minutes}m
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Regular Queue Section */}
      {hasQueue && (
        <>
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-1.5 h-6 bg-brand-green rounded-full mr-3"></div>
              <h3 className="text-sm font-bold text-[#5f5e5e] uppercase tracking-wider">Awaiting Doctor</h3>
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-brand-green/10 text-brand-green">
                {queue.length}
              </span>
            </div>
            <Link href="/queue" className="text-xs font-bold text-clinical-primary hover:text-clinical-primary-hover uppercase tracking-wider">
              View All
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {queue.slice(0, 5).map((entry, idx) => (
              <div key={entry.id ?? entry.patient?.id ?? idx} className="px-6 py-3 flex items-center justify-between hover:bg-[#fcf9f8]/40 transition-colors">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold border ${getPriorityColor(entry.priority)}`}>
                    {getPriorityLabel(entry.priority)}
                  </span>
                  <div>
                    <Link href={`/patients/${entry.patient.id}`} className="text-sm font-semibold text-gray-900 hover:text-clinical-primary hover:underline">
                      {entry.patient.first_name} {entry.patient.last_name}
                    </Link>
                    <p className="text-xs text-gray-400 font-mono">{entry.patient.hospital_number}</p>
                  </div>
                </div>
                <span className={`text-xs font-mono font-semibold ${getWaitColor(entry.entered_queue_at)}`}>
                  {getWaitTime(entry.entered_queue_at)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
