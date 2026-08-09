"use client";

import Link from "next/link";

interface QueueEntry {
  id?: number;
  patient: {
    id: number;
    first_name: string;
    last_name: string;
    hospital_number: string;
  };
  priority: number;
  entered_queue_at: string;
  status: string;
}

function getWaitMinutes(enteredAt: string): number {
  return Math.floor((Date.now() - new Date(enteredAt).getTime()) / 60000);
}

function formatWait(minutes: number): string {
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m`;
  const hrs = Math.floor(minutes / 60);
  return `${hrs}h ${minutes % 60}m`;
}

function getWaitColor(minutes: number): string {
  if (minutes > 30) return "text-red-600 bg-red-50";
  if (minutes > 10) return "text-amber-600 bg-amber-50";
  return "text-emerald-600 bg-emerald-50";
}

function getPriorityBadge(priority: number): { label: string; className: string } {
  if (priority <= 2) return { label: "HIGH", className: "bg-red-100 text-red-800 border-red-200" };
  if (priority <= 3) return { label: "MED", className: "bg-amber-100 text-amber-800 border-amber-200" };
  return { label: "LOW", className: "bg-emerald-100 text-emerald-800 border-emerald-200" };
}

export function QueuePatientCard({ entry }: { entry: QueueEntry }) {
  const waitMinutes = getWaitMinutes(entry.entered_queue_at);
  const badge = getPriorityBadge(entry.priority);

  return (
    <div className="px-6 py-4 flex items-center justify-between hover:bg-[#fcf9f8]/40 transition-colors border-b border-gray-50 last:border-b-0">
      <div className="flex items-center gap-4">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded border text-[10px] font-extrabold ${badge.className}`}>
          {badge.label}
        </span>
        <div>
          <Link href={`/patients/${entry.patient.id}`} className="text-sm font-semibold text-gray-900 hover:text-clinical-primary hover:underline">
            {entry.patient.first_name} {entry.patient.last_name}
          </Link>
          <p className="text-xs text-gray-500 font-mono">{entry.patient.hospital_number}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-bold font-mono ${getWaitColor(waitMinutes)}`}>
          {formatWait(waitMinutes)}
        </span>
        <Link
          href={`/patients/${entry.patient.id}/triage`}
          className="text-xs font-bold text-clinical-primary hover:text-clinical-primary-hover uppercase tracking-wider"
        >
          Triage
        </Link>
      </div>
    </div>
  );
}
